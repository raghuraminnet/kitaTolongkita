using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Infrastructure.Data;

namespace KitaTolongKita.Api.Controllers.AdminArea;

[ApiController]
[Route("api/admin/auth")]
public class AdminAuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<AdminAuthController> _logger;

    public AdminAuthController(AppDbContext db, IConfiguration config, ILogger<AdminAuthController> logger)
    {
        _db = db;
        _config = config;
        _logger = logger;
    }

    /// <summary>Admin portal login.</summary>
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] AdminLoginRequest req)
    {
        var user = await _db.AdminUsers.FirstOrDefaultAsync(u => u.Email == req.Email && u.IsActive);
        if (user == null)
            return Unauthorized(new AdminApiResponse(false, "Invalid credentials."));

        if (!BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new AdminApiResponse(false, "Invalid credentials."));

        user.LastLoginAt = DateTime.UtcNow;
        user.LastLoginIp = HttpContext.Connection.RemoteIpAddress?.ToString();
        await _db.SaveChangesAsync();

        var token = GenerateJwt(user);
        return Ok(new AdminLoginResponse(token, user.FullName, user.Role, 86400));
    }

    /// <summary>Get current admin user profile.</summary>
    [Authorize(AuthenticationSchemes = "AdminJwt")]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (idClaim == null) return Unauthorized();
        var user = await _db.AdminUsers.FindAsync(int.Parse(idClaim));
        if (user == null) return NotFound();
        return Ok(new { user.Id, user.Email, user.FullName, user.Role, user.IsActive });
    }

    /// <summary>Change own password.</summary>
    [Authorize(AuthenticationSchemes = "AdminJwt")]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest req)
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (idClaim == null) return Unauthorized();
        var adminId = int.Parse(idClaim);

        var user = await _db.AdminUsers.FindAsync(adminId);
        if (user == null) return NotFound();

        if (!BCrypt.Net.BCrypt.Verify(req.OldPassword, user.PasswordHash))
            return BadRequest(new AdminApiResponse(false, "Old password is incorrect."));

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        await _db.SaveChangesAsync();

        return Ok(new AdminApiResponse(true, "Password changed successfully."));
    }

    /// <summary>Request password reset (token printed to server log — for dev only).</summary>
    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest req)
    {
        var user = await _db.AdminUsers.FirstOrDefaultAsync(u => u.Email == req.Email);
        if (user == null)
        {
            // Always return success to prevent email enumeration
            _logger.LogInformation("Forgot password request for unknown email: {Email}", req.Email);
            return Ok(new AdminApiResponse(true, "If that email exists, a reset token has been generated."));
        }

        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        user.PasswordResetToken = token;
        user.PasswordResetTokenExpiry = DateTime.UtcNow.AddHours(1);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Password reset token for {Email}: {Token}", user.Email, token);
        return Ok(new AdminApiResponse(true, "If that email exists, a reset token has been generated."));
    }

    /// <summary>Reset password using token.</summary>
    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest req)
    {
        var user = await _db.AdminUsers
            .FirstOrDefaultAsync(u => u.PasswordResetToken == req.Token
                && u.PasswordResetTokenExpiry > DateTime.UtcNow);

        if (user == null)
            return BadRequest(new AdminApiResponse(false, "Invalid or expired reset token."));

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        user.PasswordResetToken = null;
        user.PasswordResetTokenExpiry = null;
        await _db.SaveChangesAsync();

        _logger.LogInformation("Password reset completed for {Email}", user.Email);
        return Ok(new AdminApiResponse(true, "Password reset successful. You can now login."));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private string GenerateJwt(AdminUser user)
    {
        var secret = _config["Jwt:AdminSecret"]
            ?? "KitaTolongKita-Admin-Secret-Key-2024-LongerThan32Chars!";
        var issuer = _config["Jwt:AdminIssuer"] ?? "KitaTolongKitaAdmin";
        var audience = _config["Jwt:AdminAudience"] ?? "KitaTolongKitaAdminPortal";

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Role, user.Role)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expires = DateTime.UtcNow.AddDays(1);

        var token = new JwtSecurityToken(issuer, audience, claims,
            expires: expires, signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

// Request DTOs are shared via AdminDtos.cs
