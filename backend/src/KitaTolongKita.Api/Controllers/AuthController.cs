using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using KitaTolongKita.Core.DTOs;
using KitaTolongKita.Core.Interfaces;
using KitaTolongKita.Infrastructure.Data;

namespace KitaTolongKita.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;
    private readonly AppDbContext _db;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IAuthService auth, AppDbContext db, ILogger<AuthController> logger)
    {
        _auth = auth;
        _db = db;
        _logger = logger;
    }

    /// <summary>Register with email + password. Sends verification OTP to email.</summary>
    [HttpPost("email/signup")]
    public async Task<IActionResult> EmailSignup([FromBody] EmailSignupRequest request)
    {
        try
        {
            var result = await _auth.EmailSignupAsync(request);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    /// <summary>Login with email + password. Returns JWT on success.</summary>
    [HttpPost("email/login")]
    public async Task<IActionResult> EmailLogin([FromBody] EmailLoginRequest request)
    {
        try
        {
            var result = await _auth.EmailLoginAsync(request);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (InvalidOperationException ex) when (ex.Message == "EMAIL_NOT_VERIFIED")
        {
            return BadRequest(new { message = "Please verify your email first. A new OTP has been sent." });
        }
    }

    /// <summary>Authenticate with Google ID token. Returns JWT on success.</summary>
    [HttpPost("google")]
    public async Task<IActionResult> GoogleAuth([FromBody] GoogleAuthRequest request)
    {
        try
        {
            var result = await _auth.GoogleAuthAsync(request);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    /// <summary>Send an OTP to the user's email.</summary>
    [HttpPost("otp/send")]
    public async Task<IActionResult> SendOtp([FromBody] SendOtpRequest request)
    {
        try
        {
            var result = await _auth.SendOtpAsync(request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send OTP to {Email}", request.Email);
            return BadRequest(new { message = "Failed to send OTP. Please try again." });
        }
    }

    /// <summary>Verify an OTP code. Confirms email/phone if purpose is verification.</summary>
    [HttpPost("otp/verify")]
    public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpRequest request)
    {
        try
        {
            var user = await _auth.VerifyOtpAsync(request);
            return Ok(user);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "OTP verification failed for {Email}", request.Email);
            return BadRequest(new { message = "Invalid or expired OTP." });
        }
    }

    /// <summary>Refresh an access token.</summary>
    [HttpPost("refresh")]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        try
        {
            var result = await _auth.RefreshTokenAsync(request);
            return Ok(result);
        }
        catch (NotImplementedException)
        {
            return BadRequest(new { message = "Token refresh not yet implemented." });
        }
    }

    /// <summary>Initiate password reset — sends OTP to the user's email.</summary>
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        try
        {
            // Always return success to prevent email enumeration attacks
            var user = await _auth.GetUserByEmailAsync(request.Email);
            if (user != null)
            {
                await _auth.SendOtpAsync(new SendOtpRequest(request.Email, "PasswordReset"));
            }
            return Ok(new { message = "If an account exists, a reset code has been sent." });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Forgot password failed for {Email}", request.Email);
            // Still return 200 to prevent enumeration
            return Ok(new { message = "If an account exists, a reset code has been sent." });
        }
    }

    /// <summary>Reset password using the OTP sent to the user's email.</summary>
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        try
        {
            await _auth.ResetPasswordAsync(request);
            return Ok(new { message = "Password reset successful. Please sign in." });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Password reset failed for {Email}", request.Email);
            return BadRequest(new { message = "Password reset failed. Please try again." });
        }
    }

    /// <summary>Get current user profile.</summary>
    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
            return Unauthorized();

        // Fetch fresh user data from DB so avatarUrl is current
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        return Ok(new
        {
            id = user.Id,
            email = user.Email,
            fullName = user.FullName,
            phone = user.Phone,
            avatarUrl = user.AvatarUrl,
            emailVerified = user.EmailVerified,
            phoneVerified = user.PhoneVerified,
            createdAt = user.CreatedAt,
        });
    }
}
