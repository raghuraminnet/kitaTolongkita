namespace KitaTolongKita.Core.DTOs;

// ── Requests ────────────────────────────────────────────────────────────────

public record EmailSignupRequest(string Email, string FullName, string Password);

public record EmailLoginRequest(string Email, string Password);

public record SendOtpRequest(string Email, string Purpose);

public record VerifyOtpRequest(string Email, string Code, string Purpose);

public record GoogleAuthRequest(string IdToken);

public record RefreshTokenRequest(string RefreshToken);

public record ForgotPasswordRequest(string Email);

public record ResetPasswordRequest(string Email, string NewPassword, string OtpCode);

// ── Responses ───────────────────────────────────────────────────────────────

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt,
    UserDto User
);

public record UserDto(
    Guid Id,
    string Email,
    string? Phone,
    string FullName,
    string? AvatarUrl,
    bool EmailVerified,
    bool PhoneVerified
);

public record OtpSentResponse(string Message, DateTime ExpiresAt);

public record MessageResponse(string Message);
