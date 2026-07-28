using KitaTolongKita.Core.Entities;

namespace KitaTolongKita.Core.Interfaces;

/// <summary>
/// AI-powered content moderation service.
/// Analyses deal content (text + images) for fraud, scams, pricing manipulation,
/// wrong information, nudity, irrelevant content, and duplicate postings.
/// </summary>
public interface IModerationService
{
    /// <summary>
    /// Analyse a deal and return a moderation result with a score (0-100) and flags.
    /// Score ≥ 80 → Auto-Approved | Score 50-79 → Pending Review | Score &lt; 50 → Rejected
    /// </summary>
    Task<ModerationResult> AnalyseDealAsync(Deal deal);

    /// <summary>
    /// Check if a deal is a potential duplicate of an existing one.
    /// </summary>
    Task<Guid?> FindDuplicateDealIdAsync(Deal deal);
}

public class ModerationResult
{
    public Guid DealId { get; set; }
    public int Score { get; set; } // 0-100
    public List<ModerationFlag> Flags { get; set; } = new();
    public string Summary { get; set; } = string.Empty;
    public ModerationDecision Decision { get; set; }
    public string AiProvider { get; set; } = string.Empty;
    public string? RawResponse { get; set; }
    public DateTime AnalysedAt { get; set; } = DateTime.UtcNow;
}

public enum ModerationFlag
{
    None,
    Fraud,
    Scam,
    PriceManipulation,
    WrongInformation,
    Nudity,
    IrrelevantImage,
    IrrelevantContent,
    Duplicate,
    OffensiveContent,
    SuspiciousLink
}

public enum ModerationDecision
{
    AutoApproved,
    PendingReview,
    Rejected
}
