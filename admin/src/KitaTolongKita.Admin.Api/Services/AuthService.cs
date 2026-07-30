using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
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
    Task<AdminUser?> GetByIdAsync(int id);
}

public class AuthService : IAuthService
{
    private readonly AdminDbContext _db;
    private readonly IConfiguration _config;

    public AuthService(AdminDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public async Task<AdminLoginResponse?> LoginAsync(AdminLoginRequest req, string? ip)
    {
        var user = await _db.AdminUsers.FirstOrDefaultAsync(x => x.Email == req.Email && x.IsActive);
        if (user == null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return null;

        user.LastLoginAt = DateTime.UtcNow;
        user.LastLoginIp = ip;
        await _db.SaveChangesAsync();

        var secret = _config["Jwt:Secret"] ?? "KitaTolongKita-Admin-Secret-Key-2024!@#$";
        var issuer = _config["Jwt:Issuer"] ?? "KitaTolongKitaAdmin";
        var audience = _config["Jwt:Audience"] ?? "KitaTolongKitaAdminPortal";
        var expiryMin = int.Parse(_config["Jwt:AccessTokenExpiryMinutes"] ?? "480");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Role, user.Role),
        };

        var token = new JwtSecurityToken(issuer, audience, claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMin),
            signingCredentials: creds);

        return new AdminLoginResponse(
            new JwtSecurityTokenHandler().WriteToken(token),
            user.FullName,
            user.Role,
            expiryMin * 60
        );
    }

    public async Task<AdminUser?> GetByIdAsync(int id) =>
        await _db.AdminUsers.FindAsync(id);
}
