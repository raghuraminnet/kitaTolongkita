namespace KitaTolongKita.Core.Entities;

/// <summary>A user-submitted report against a deal or another user.</summary>
public class Report
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // ── What is being reported ─────────────────────────────────────────────────
    public ReportType Type { get; set; }
    public Guid TargetId { get; set; }   // Deal.Id or User.Id depending on Type

    // ── Who filed it ──────────────────────────────────────────────────────────
    public Guid ReporterId { get; set; }
    public User? Reporter { get; set; }

    // ── Why ───────────────────────────────────────────────────────────────────
    /// <summary>Bitmask of ReportReason flags.</summary>
    public List<ReportReason> Reasons { get; set; } = [];
    public string? Description { get; set; }

    // ── Resolution ─────────────────────────────────────────────────────────────
    public ReportStatus Status { get; set; } = ReportStatus.New;
    public string? AdminNotes { get; set; }

    /// <summary>The primary corrective action taken.</summary>
    public ReportAction Action { get; set; } = ReportAction.None;

    public Guid? ResolvedById { get; set; }  // Admin's user GUID from JWT
    public DateTime? ResolvedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // ── Convenience ────────────────────────────────────────────────────────────
    public bool IsResolved => Status == ReportStatus.Resolved || Status == ReportStatus.Dismissed;
}

public enum ReportType
{
    Deal,
    User
}

[Flags]
public enum ReportReason
{
    None                = 0,
    PriceGouging        = 1 << 0,   // "Price is unrealistic / too expensive"
    MisleadingPricing   = 1 << 1,   // "Original price shown is fake / inflated"
    Counterfeit         = 1 << 2,   // "Suspected counterfeit / fake product"
    ItemNotAsDescribed  = 1 << 3,   // "Product doesn't match description or photos"
    DangerousProduct    = 1 << 4,   // "Safety, health, or legal concern"
    SpamDuplicate       = 1 << 5,   // "Duplicate or spam post"
    CoordinatedDeals    = 1 << 6,   // "Organized suspicious / misleading group deals"
    InappropriateContent = 1 << 7,  // "Inappropriate, offensive, or explicit content"
    Harassment          = 1 << 8,   // "Harassment, bullying, or threats"
    FakeDeal            = 1 << 9,    // "Completely fake deal / bait-and-switch"
    PhishingScam        = 1 << 10,  // "Contains phishing link or scam intent"
    FakeEngagement      = 1 << 11,  // "Fake upvotes, likes, or reviews"
    SuspiciousPoster     = 1 << 12,  // "Poster appears fake, bot-like, or impersonating"
    Other               = 1 << 13,  // "Something else" (free-text description required)
}

public enum ReportStatus
{
    New,
    UnderReview,
    ActionTaken,
    Dismissed,
    Resolved
}

/// <summary>Admin actions that can be taken on a resolved report.</summary>
public enum ReportAction
{
    None,
    DealHidden,            // Deal hidden from app search/feed (soft-delete)
    UserWarned,            // Informal warning sent to user
    PostingRevoked,        // User cannot create new deals temporarily
    AccountSuspended,      // User account temporarily locked
    AccountBanned,         // User account permanently banned
}
