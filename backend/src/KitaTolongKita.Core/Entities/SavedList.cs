using System;
using System.Collections.Generic;

namespace KitaTolongKita.Core.Entities;

/// <summary>A user-defined list for grouping saved deals (e.g. "Favorites", "Birthday Ideas").</summary>
public class SavedList
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    public string Name { get; set; } = string.Empty;

    /// <summary>Whether this list is visible to other users.</summary>
    public bool IsPublic { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
    public List<SavedDeal> SavedDeals { get; set; } = [];
}
