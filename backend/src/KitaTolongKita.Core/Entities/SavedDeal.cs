using System;

namespace KitaTolongKita.Core.Entities;

/// <summary>A deal saved by a user into one of their lists.</summary>
public class SavedDeal
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    public Guid DealId { get; set; }

    public Guid ListId { get; set; }

    public DateTime SavedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
    public Deal Deal { get; set; } = null!;
    public SavedList List { get; set; } = null!;
}
