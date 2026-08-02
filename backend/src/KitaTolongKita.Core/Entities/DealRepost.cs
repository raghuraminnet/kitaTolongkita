namespace KitaTolongKita.Core.Entities;

public class DealRepost
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DealId { get; set; }
    public Guid UserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Deal Deal { get; set; } = null!;
    public User User { get; set; } = null!;
}
