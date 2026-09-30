namespace KitaTolongKita.Core.Entities;

public class AdminAlert
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Type { get; set; } = string.Empty; // "deal_flagged" | "user_report" | "contributor_application" | "order_escalation" | "system_alert"
    public string Severity { get; set; } = "info"; // "urgent" | "high" | "medium" | "info"
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? TargetId { get; set; } // dealId, reportId, applicationId, orderId
    public string? ActionUrl { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
