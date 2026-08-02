namespace KitaTolongKita.Core.Entities;

public class UserFollow
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid FollowerId { get; set; }
    public Guid FollowingId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User Follower { get; set; } = null!;
    public User Following { get; set; } = null!;
}
