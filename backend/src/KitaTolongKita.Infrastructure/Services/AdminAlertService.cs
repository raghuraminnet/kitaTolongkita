using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Infrastructure.Data;

namespace KitaTolongKita.Infrastructure.Services;

public interface IAdminAlertService
{
    Task<AdminAlert> CreateAlertAsync(string type, string severity, string title, string message, string? targetId = null, string? actionUrl = null);
    Task<(List<AdminAlert> Items, int Total, int UnreadCount)> GetAlertsAsync(bool? isRead = null, string? severity = null, int page = 1, int pageSize = 20);
    Task<int> GetUnreadCountAsync();
    Task<bool> MarkAsReadAsync(Guid alertId);
    Task<int> MarkAllAsReadAsync();
}

public class AdminAlertService : IAdminAlertService
{
    private readonly AppDbContext _db;
    private readonly ILogger<AdminAlertService> _logger;

    public AdminAlertService(AppDbContext db, ILogger<AdminAlertService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<AdminAlert> CreateAlertAsync(string type, string severity, string title, string message, string? targetId = null, string? actionUrl = null)
    {
        try
        {
            var alert = new AdminAlert
            {
                Type = type,
                Severity = severity.ToLowerInvariant(),
                Title = title,
                Message = message,
                TargetId = targetId,
                ActionUrl = actionUrl,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };

            _db.AdminAlerts.Add(alert);
            await _db.SaveChangesAsync();
            _logger.LogInformation("Admin alert created: [{Severity}] {Title}", severity, title);
            return alert;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create admin alert: {Title}", title);
            throw;
        }
    }

    public async Task<(List<AdminAlert> Items, int Total, int UnreadCount)> GetAlertsAsync(bool? isRead = null, string? severity = null, int page = 1, int pageSize = 20)
    {
        var query = _db.AdminAlerts.AsNoTracking().AsQueryable();

        if (isRead.HasValue)
        {
            query = query.Where(a => a.IsRead == isRead.Value);
        }

        if (!string.IsNullOrWhiteSpace(severity))
        {
            query = query.Where(a => a.Severity == severity.ToLowerInvariant());
        }

        var total = await query.CountAsync();
        var unreadCount = await _db.AdminAlerts.CountAsync(a => !a.IsRead);

        var items = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, total, unreadCount);
    }

    public async Task<int> GetUnreadCountAsync()
    {
        return await _db.AdminAlerts.CountAsync(a => !a.IsRead);
    }

    public async Task<bool> MarkAsReadAsync(Guid alertId)
    {
        var alert = await _db.AdminAlerts.FindAsync(alertId);
        if (alert == null) return false;

        alert.IsRead = true;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<int> MarkAllAsReadAsync()
    {
        var unreadAlerts = await _db.AdminAlerts.Where(a => !a.IsRead).ToListAsync();
        foreach (var alert in unreadAlerts)
        {
            alert.IsRead = true;
        }
        return await _db.SaveChangesAsync();
    }
}
