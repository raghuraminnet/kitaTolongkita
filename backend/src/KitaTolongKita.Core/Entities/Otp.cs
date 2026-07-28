namespace KitaTolongKita.Core.Entities;

public class OtpCode
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public OtpPurpose Purpose { get; set; }
    public DateTime ExpiresAt { get; set; }
    public bool Used { get; set; }
    public int Attempts { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public enum OtpPurpose
{
    EmailVerification,
    PhoneVerification,
    PasswordReset,
    Login
}
