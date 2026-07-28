namespace KitaTolongKita.Core.Entities;

/// <summary>In-app notification stored in the database for push delivery history.</summary>
public class UserNotification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Type { get; set; } = string.Empty; // "deal_approved" | "deal_rejected" | "chat_message" | "verification_reminder"
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string? DataJson { get; set; } // JSON serialized extra data (dealId, conversationId, etc.)
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
