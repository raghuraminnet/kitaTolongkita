namespace KitaTolongKita.Core.Entities;

/// <summary>User application to become a contributor (KYC review by admin).</summary>
public class ContributorApplication
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Status { get; set; } = "Pending"; // Pending | UnderReview | Approved | OnHold | Rejected
    public string? RejectionReason { get; set; }

    // KYC Fields (PII — should be encrypted at rest in production)
    public string MobileNo { get; set; } = string.Empty;
    public string IcPassportNo { get; set; } = string.Empty;
    public string Nationality { get; set; } = string.Empty;
    public string Race { get; set; } = string.Empty;
    public string ResidentStatus { get; set; } = string.Empty; // "Resident" | "Non-Resident"

    // Review metadata
    public int? ReviewedBy { get; set; }   // admin user id
    public DateTime? ReviewedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ApprovedAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
}
