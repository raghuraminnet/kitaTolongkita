namespace KitaTolongKita.Core.Entities;

public class UserNotificationPreference
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public bool NotifyFollow { get; set; } = true;
    public bool NotifyFollowedDeal { get; set; } = false;  // opt-in: new deal from someone I follow
    public bool NotifyLikes { get; set; } = true;
    public bool NotifyComments { get; set; } = true;
    public bool NotifyLookups { get; set; } = true;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
}
