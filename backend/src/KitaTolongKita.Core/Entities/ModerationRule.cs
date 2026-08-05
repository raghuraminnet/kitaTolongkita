namespace KitaTolongKita.Core.Entities;

/// <summary>
/// Moderation thresholds and feature flags managed from the admin portal.
/// </summary>
public class ModerationRule
{
    public int Id { get; set; }
    public string Key { get; set; } = string.Empty;   // e.g. "auto_approve_threshold"
    public string Value { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Category { get; set; } = string.Empty; // "ai" | "deal" | "pilot"
    public bool IsActive { get; set; } = true;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public int UpdatedByAdminId { get; set; }
}
