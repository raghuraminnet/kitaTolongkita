namespace KitaTolongKita.Core.Entities;

public class DealComment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DealId { get; set; }
    public Guid UserId { get; set; }
    public Guid? ParentId { get; set; }     // for future threaded replies
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public bool IsHidden { get; set; } = false;
    public string ModerationStatus { get; set; } = "Approved"; // Approved | PendingReview | Rejected

    // Navigation
    public Deal Deal { get; set; } = null!;
    public User User { get; set; } = null!;
    public DealComment? Parent { get; set; }
    public ICollection<DealComment> Replies { get; set; } = new List<DealComment>();
}
