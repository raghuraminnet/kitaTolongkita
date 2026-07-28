namespace KitaTolongKita.Core.Entities;

public class PushToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Token { get; set; } = string.Empty; // FCM token
    public string Platform { get; set; } = string.Empty; // "android" | "ios"
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastUsedAt { get; set; }
    public bool IsActive { get; set; } = true;
}
