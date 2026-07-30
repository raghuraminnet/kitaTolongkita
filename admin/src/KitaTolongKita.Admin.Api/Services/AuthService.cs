using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using KitaTolongKita.Admin.Api.Data;
using KitaTolongKita.Admin.Api.DTOs;
using KitaTolongKita.Admin.Api.Entities;

namespace KitaTolongKita.Admin.Api.Services;

public interface IAuthService
{
    Task<AdminLoginResponse?> LoginAsync(AdminLoginRequest req, string? ip);
    Task<bool> ForgotPasswordAsync(string email);
    Task<bool> ResetPasswordAsync(ResetPasswordRequest req);
    Task<bool> ChangePasswordAsync(int adminId, string oldPassword, string newPassword);
    Task<AdminUser?> GetByIdAsync(int id);
    Task<AdminUser?> GetByEmailAsync(string email);
}

public class AuthService : IAuthService
{
    private readonly AdminDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<AuthService> _logger;

    public AuthService(AdminDbContext db, IConfiguration config, ILogger<AuthService> logger)
    {
        _db = db;
        _config = config;
        _logger = logger;
    }

    public async Task<AdminLoginResponse?> LoginAsync(AdminLoginRequest req, string? ip)
    {
        var user = await _db.AdminUsers.FirstOrDefaultAsync(x => x.Email == req.Email && x.IsActive);
        if (user == null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return null;

        user.LastLoginAt = DateTime.UtcNow;
        user.LastLoginIp = ip;
        await _db.SaveChangesAsync();

        var token = GenerateToken(user);
        return new AdminLoginResponse(
            new JwtSecurityTokenHandler().WriteToken(token),
            user.FullName,
            user.Role,
            int.Parse(_config["Jwt:AccessTokenExpiryMinutes"] ?? "480") * 60
        );
    }

    public async Task<bool> ForgotPasswordAsync(string email)
    {
        var user = await _db.AdminUsers.FirstOrDefaultAsync(x => x.Email == email);
        if (user == null) return false; // Don't reveal if user exists

        var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
        user.PasswordResetToken = token;
        user.PasswordResetTokenExpiry = DateTime.UtcNow.AddHours(1);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Password reset token generated for {Email}", email);
        // In production, send email here. For now, log the token.
        _logger.LogWarning("RESET TOKEN for {Email}: {Token} (expires in 1h)", email, token);
        return true;
    }

    public async Task<bool> ResetPasswordAsync(ResetPasswordRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Token) || string.IsNullOrWhiteSpace(req.NewPassword))
            return false;

        var user = await _db.AdminUsers.FirstOrDefaultAsync(x =>
            x.PasswordResetToken == req.Token &&
            x.PasswordResetTokenExpiry != null &&
            x.PasswordResetTokenExpiry > DateTime.UtcNow);

        if (user == null) return false;

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        user.PasswordResetToken = null;
        user.PasswordResetTokenExpiry = null;
        await _db.SaveChangesAsync();

        _logger.LogInformation("Password reset successful for {Email}", user.Email);
        return true;
    }

    public async Task<bool> ChangePasswordAsync(int adminId, string oldPassword, string newPassword)
    {
        var user = await _db.AdminUsers.FindAsync(adminId);
        if (user == null) return false;
        if (!BCrypt.Net.BCrypt.Verify(oldPassword, user.PasswordHash)) return false;

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<AdminUser?> GetByIdAsync(int id) =>
        await _db.AdminUsers.FindAsync(id);

    public async Task<AdminUser?> GetByEmailAsync(string email) =>
        await _db.AdminUsers.FirstOrDefaultAsync(x => x.Email == email);

    private JwtSecurityToken GenerateToken(AdminUser user)
    {
        var secret = _config["Jwt:Secret"] ?? "KitaTolongKita-Admin-Secret-Key-2024!@#$";
        var issuer = _config["Jwt:Issuer"] ?? "KitaTolongKitaAdmin";
        var audience = _config["Jwt:Audience"] ?? "KitaTolongKitaAdminPortal";
        var expiryMin = int.Parse(_config["Jwt:AccessTokenExpiryMinutes"] ?? "480");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        return new JwtSecurityToken(issuer, audience,
            new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, user.FullName),
                new Claim(ClaimTypes.Role, user.Role),
            },
            expires: DateTime.UtcNow.AddMinutes(expiryMin),
            signingCredentials: creds);
    }
}
