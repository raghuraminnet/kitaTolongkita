namespace KitaTolongKita.Core.Entities;

public class Deal
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrganizerId { get; set; }
    public User? Organizer { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public decimal OriginalPrice { get; set; }
    public decimal GroupPrice { get; set; }
    public int MinMembers { get; set; }
    public int MaxMembers { get; set; } = int.MaxValue;
    public int MembersJoined { get; set; }
    public DateTime Deadline { get; set; }
    public string PickupLocation { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public List<string> ImageUrls { get; set; } = [];
    public DealStatus Status { get; set; } = DealStatus.Draft;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PublishedAt { get; set; }
    public DealCategory DealCategory { get; set; } = DealCategory.Other;

    // ── Location ────────────────────────────────────────────────────────────────
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? LocationName { get; set; }

    // ── Engagement ─────────────────────────────────────────────────────────────
    public List<string> Hashtags { get; set; } = [];
    public int UpvoteCount { get; set; }
    public int LikeCount { get; set; }

    // ── Community Verification ──────────────────────────────────────────────────
    public int VerificationCount { get; set; }
    public DateTime? LastVerifiedAt { get; set; }
    public List<DealVerification> Verifications { get; set; } = [];
    public List<DealReaction> Reactions { get; set; } = [];

    // ── AI Moderation ──────────────────────────────────────────────────────────
    public ModerationStatus ModerationStatus { get; set; } = ModerationStatus.Pending;
    public int? ModerationScore { get; set; }
    public List<string> ModerationFlags { get; set; } = [];
    public string? ModerationRejectReason { get; set; }
    public string? DuplicateOfDealId { get; set; }

    public List<DealOrder> Orders { get; set; } = [];
}

public enum DealStatus
{
    Draft,
    Active,
    Fulfilled,
    Cancelled,
    Expired,
    /// <summary>Hidden by admin after a report — excluded from search and app listings.</summary>
    Hidden,
}

public enum DealCategory
{
    Food,
    Electronics,
    Fashion,
    Home,
    Beauty,
    Sports,
    Drinks,
    Other
}

public enum ModerationStatus
{
    Pending,
    UnderReview,
    Approved,
    Rejected,
    Expired
}

public class DealOrder
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DealId { get; set; }
    public Deal? Deal { get; set; }
    public Guid BuyerId { get; set; }
    public int Quantity { get; set; } = 1;
    public decimal TotalPrice { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.Pending;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ConfirmedAt { get; set; }
}

public enum OrderStatus
{
    Pending,
    Confirmed,
    Ready,
    Collected,
    Cancelled,
    Refunded
}

/// <summary>Tracks when a user verifies a deal location in person.</summary>
public class DealVerification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DealId { get; set; }
    public Guid UserId { get; set; }
    public bool OfferStillAvailable { get; set; }
    public string? Notes { get; set; }
    public DateTime VerifiedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Tracks upvotes and likes on a deal.</summary>
public class DealReaction
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DealId { get; set; }
    public Guid UserId { get; set; }
    public ReactionType Type { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public enum ReactionType
{
    Upvote,   // "Real Deal" — user confirms deal is legitimate
    Like      // Simple like/favourite
}
