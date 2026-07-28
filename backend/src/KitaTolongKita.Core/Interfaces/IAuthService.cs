using KitaTolongKita.Core.DTOs;
using KitaTolongKita.Core.Entities;

namespace KitaTolongKita.Core.Interfaces;

public interface IAuthService
{
    Task<AuthResponse> EmailSignupAsync(EmailSignupRequest request);
    Task<AuthResponse> EmailLoginAsync(EmailLoginRequest request);
    Task<AuthResponse> GoogleAuthAsync(GoogleAuthRequest request);
    Task<OtpSentResponse> SendOtpAsync(SendOtpRequest request);
    Task<UserDto> VerifyOtpAsync(VerifyOtpRequest request);
    Task<UserDto?> GetUserByEmailAsync(string email);
    Task<AuthResponse> RefreshTokenAsync(RefreshTokenRequest request);
    Task<MessageResponse> ResetPasswordAsync(ResetPasswordRequest request);
    string HashPassword(string password);
    bool VerifyPassword(string password, string hash);
}

public interface IOtpService
{
    Task<OtpCode> GenerateOtpAsync(string email, string phone, OtpPurpose purpose);
    Task<bool> ValidateOtpAsync(string email, string code, OtpPurpose purpose);
    Task MarkOtpUsedAsync(string email, string code);
}

public interface ITokenService
{
    string GenerateAccessToken(User user);
    string GenerateRefreshToken();
    DateTime GetAccessTokenExpiry();
}
