namespace KitaTolongKita.Core.Entities;

/// <summary>
/// Key-value app settings managed from the admin portal.
/// </summary>
public class AppSetting
{
    public int Id { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public int UpdatedByAdminId { get; set; }
}
