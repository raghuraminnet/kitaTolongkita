using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitaTolongKita.Admin.Api.DTOs;
using KitaTolongKita.Admin.Api.Services;

namespace KitaTolongKita.Admin.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;
    private readonly IAdminService _admin;

    public AuthController(IAuthService auth, IAdminService admin)
    {
        _auth = auth;
        _admin = admin;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] AdminLoginRequest req)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _auth.LoginAsync(req, ip);
        if (result == null)
            return Unauthorized(new ApiResponse(false, "Invalid email or password."));
        return Ok(new ApiResponse(true, "Login successful", result));
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest req)
    {
        var ok = await _auth.ForgotPasswordAsync(req.Email);
        // Always return success to prevent email enumeration
        return Ok(new ApiMessage(true, "If that email exists, a reset token has been generated. Check server logs."));
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest req)
    {
        var ok = await _auth.ResetPasswordAsync(req);
        if (!ok) return BadRequest(new ApiResponse(false, "Invalid or expired reset token."));
        return Ok(new ApiResponse(true, "Password reset successful. You can now login."));
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest req)
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (idClaim == null) return Unauthorized();
        var adminId = int.Parse(idClaim);

        var ok = await _auth.ChangePasswordAsync(adminId, req.OldPassword, req.NewPassword);
        if (!ok) return BadRequest(new ApiResponse(false, "Old password is incorrect."));
        return Ok(new ApiResponse(true, "Password changed successfully."));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (idClaim == null) return Unauthorized();
        var id = int.Parse(idClaim);
        var user = await _auth.GetByIdAsync(id);
        if (user == null) return NotFound();
        return Ok(new { user.Id, user.Email, user.FullName, user.Role, user.IsActive });
    }
}
