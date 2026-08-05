namespace KitaTolongKita.Core.Entities;

/// <summary>
/// Audit trail for all admin actions performed in the admin portal.
/// </summary>
public class AuditLog
{
    public int Id { get; set; }
    public int AdminUserId { get; set; }
    public string AdminEmail { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string? Details { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
