using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using KitaTolongKita.Core.DTOs;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Core.Interfaces;
using KitaTolongKita.Infrastructure.Data;

namespace KitaTolongKita.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly ITokenService _tokenService;
    private readonly IOtpService _otpService;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        AppDbContext db,
        ITokenService tokenService,
        IOtpService otpService,
        ILogger<AuthService> logger)
    {
        _db = db;
        _tokenService = tokenService;
        _otpService = otpService;
        _logger = logger;
    }

    public async Task<AuthResponse> EmailSignupAsync(EmailSignupRequest request)
    {
        var existingUser = await _db.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (existingUser != null)
            throw new InvalidOperationException("An account with this email already exists.");

        var user = new User
        {
            Email = request.Email,
            FullName = request.FullName,
            PasswordHash = HashPassword(request.Password),
            EmailVerified = false
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        // Send verification OTP
        await _otpService.GenerateOtpAsync(user.Email, user.Phone ?? "", OtpPurpose.EmailVerification);

        return CreateAuthResponse(user);
    }

    public async Task<AuthResponse> EmailLoginAsync(EmailLoginRequest request)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == request.Email)
            ?? throw new UnauthorizedAccessException("Invalid email or password.");

        if (!VerifyPassword(request.Password, user.PasswordHash ?? ""))
            throw new UnauthorizedAccessException("Invalid email or password.");

        if (!user.EmailVerified)
        {
            await _otpService.GenerateOtpAsync(user.Email, user.Phone ?? "", OtpPurpose.EmailVerification);
            throw new InvalidOperationException("EMAIL_NOT_VERIFIED");
        }

        user.LastLoginAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return CreateAuthResponse(user);
    }

    public async Task<AuthResponse> GoogleAuthAsync(GoogleAuthRequest request)
    {
        // Validate Google ID token
        var googleUser = await ValidateGoogleTokenAsync(request.IdToken);
        if (googleUser == null)
            throw new UnauthorizedAccessException("Invalid Google token.");

        // The deserialized GoogleTokenInfo record exposes the Google user id as `Sub`
        // (the JWT "sub" claim). The previous code referenced `Subject`, which doesn't
        // exist on the record.
        var user = await _db.Users.FirstOrDefaultAsync(u => u.GoogleId == googleUser.Sub);

        if (user == null)
        {
            // Check if email already exists (signup via email previously)
            user = await _db.Users.FirstOrDefaultAsync(u => u.Email == googleUser.Email);
            if (user != null)
            {
                user.GoogleId = googleUser.Sub;
                user.AvatarUrl ??= googleUser.Picture;
                user.EmailVerified = true;
            }
            else
            {
                // New user — create account
                user = new User
                {
                    Email = googleUser.Email,
                    FullName = googleUser.Name,
                    GoogleId = googleUser.Sub,
                    AvatarUrl = googleUser.Picture,
                    EmailVerified = true
                };
                _db.Users.Add(user);
            }
        }

        user.LastLoginAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return CreateAuthResponse(user);
    }

    public async Task<OtpSentResponse> SendOtpAsync(SendOtpRequest request)
    {
        var purpose = Enum.Parse<OtpPurpose>(request.Purpose, true);
        var otp = await _otpService.GenerateOtpAsync(request.Email, "", purpose);
        return new OtpSentResponse($"OTP sent to {request.Email}", otp.ExpiresAt);
    }

    public async Task<UserDto> VerifyOtpAsync(VerifyOtpRequest request)
    {
        var purpose = Enum.Parse<OtpPurpose>(request.Purpose, true);
        var valid = await _otpService.ValidateOtpAsync(request.Email, request.Code, purpose);
        if (!valid)
            throw new UnauthorizedAccessException("Invalid or expired OTP.");

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == request.Email)
            ?? throw new InvalidOperationException("User not found.");

        if (purpose == OtpPurpose.EmailVerification)
        {
            user.EmailVerified = true;
            await _otpService.MarkOtpUsedAsync(request.Email, request.Code);
        }

        await _db.SaveChangesAsync();

        return ToUserDto(user);
    }

    public async Task<UserDto?> GetUserByEmailAsync(string email)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        return user == null ? null : ToUserDto(user);
    }

    public async Task<AuthResponse> RefreshTokenAsync(RefreshTokenRequest request)
    {
        // Refresh token rotation would be implemented here
        // For now, decode the access token and issue a new one
        throw new NotImplementedException("Refresh token rotation coming soon.");
    }

    public async Task<MessageResponse> ResetPasswordAsync(ResetPasswordRequest request)
    {
        // Validate OTP first
        var valid = await _otpService.ValidateOtpAsync(request.Email, request.OtpCode, OtpPurpose.PasswordReset);
        if (!valid)
            throw new UnauthorizedAccessException("Invalid or expired OTP.");

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == request.Email)
            ?? throw new InvalidOperationException("User not found.");

        user.PasswordHash = HashPassword(request.NewPassword);
        await _db.SaveChangesAsync();

        // Mark OTP as used
        await _otpService.MarkOtpUsedAsync(request.Email, request.OtpCode);

        // Invalidate all existing refresh tokens for this user (force re-login)
        // For now just return success — token invalidation is handled by token version in production

        return new MessageResponse("Password reset successfully.");
    }

    public string HashPassword(string password)
    {
        using var sha256 = SHA256.Create();
        var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password + "KitaTolongKita_Salt"));
        return Convert.ToBase64String(bytes);
    }

    public bool VerifyPassword(string password, string hash)
    {
        return HashPassword(password) == hash;
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private AuthResponse CreateAuthResponse(User user)
    {
        var accessToken = _tokenService.GenerateAccessToken(user);
        var refreshToken = _tokenService.GenerateRefreshToken();
        var expiresAt = _tokenService.GetAccessTokenExpiry();

        return new AuthResponse(accessToken, refreshToken, expiresAt, ToUserDto(user));
    }

    private static UserDto ToUserDto(User user) => new(
        user.Id,
        user.Email,
        user.Phone,
        user.FullName,
        user.AvatarUrl,
        user.EmailVerified,
        user.PhoneVerified
    );

    private async Task<GoogleTokenInfo?> ValidateGoogleTokenAsync(string idToken)
    {
        try
        {
            // In production: validate against Google's public keys
            // For now: decode the JWT payload (DO NOT use this in production without proper validation)
            var parts = idToken.Split('.');
            if (parts.Length != 3) return null;

            var payload = parts[1];
            var json = Encoding.UTF8.GetString(Convert.FromBase64String(payload.PadRight(payload.Length + (4 - payload.Length % 4) % 4, '=')));
            var data = System.Text.Json.JsonSerializer.Deserialize<GoogleTokenInfo>(json);

            if (data == null || string.IsNullOrEmpty(data.Email) || string.IsNullOrEmpty(data.Sub))
                return null;

            return data;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to validate Google token");
            return null;
        }
    }

    private record GoogleTokenInfo
    {
        public string Email { get; set; } = "";
        public string Name { get; set; } = "";
        // JWT "sub" claim → Google's stable user id.
        // Aliased as `Subject` so existing call sites keep working.
        public string Sub { get; set; } = "";
        public string Subject => Sub;
        public string Picture { get; set; } = "";
    }
}
