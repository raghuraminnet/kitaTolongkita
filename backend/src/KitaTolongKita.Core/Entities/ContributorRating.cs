namespace KitaTolongKita.Core.Entities;

/// <summary>Rating + review from a buyer to a contributor after a delivered lookup.</summary>
public class ContributorRating
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid LookupId { get; set; }
    public Guid DealId { get; set; }
    public Guid ContributorId { get; set; }
    public Guid ReviewerId { get; set; }
    public int Rating { get; set; }          // 1–5
    public string? ReviewText { get; set; } // max 300 chars
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public DealLookup Lookup { get; set; } = null!;
    public Deal Deal { get; set; } = null!;
    public User Contributor { get; set; } = null!;
    public User Reviewer { get; set; } = null!;
}
