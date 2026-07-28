namespace KitaTolongKita.Core.Entities;

public class NotificationPreference
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; } = Guid.NewGuid();
    public bool PushEnabled { get; set; } = true;
    public bool NotifyByCategory { get; set; } = true;
    public bool NotifyByLocation { get; set; } = true;
    public bool NotifyByProduct { get; set; } = false;
    public double LocationRadiusKm { get; set; } = 10.0;
    public List<string> EnabledCategories { get; set; } = new(); // empty = all
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
