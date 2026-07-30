using Microsoft.EntityFrameworkCore;
using KitaTolongKita.Admin.Api.Data;
using KitaTolongKita.Admin.Api.DTOs;

namespace KitaTolongKita.Admin.Api.Services;

public interface IDashboardService
{
    Task<DashboardKpis> GetKpisAsync();
}

public class DashboardService : IDashboardService
{
    private readonly AdminDbContext _db;
    private readonly HttpClient _http;

    public DashboardService(AdminDbContext db, IHttpClientFactory httpFactory)
    {
        _db = db;
        _http = httpFactory.CreateClient();
    }

    public async Task<DashboardKpis> GetKpisAsync()
    {
        var today = DateTime.UtcNow.Date;
        var weekAgo = today.AddDays(-7);

        // Fetch from main API
        int totalUsers = 0, activeDeals = 0, ordersToday = 0, newUsersToday = 0;
        decimal todayRevenue = 0;

        try
        {
            // These would call the main API with an internal API key
            // For now, return structured data
        }
        catch { /* Main API unreachable — return zeros */ }

        var recentActivity = await _db.AuditLogs
            .OrderByDescending(x => x.CreatedAt)
            .Take(10)
            .Select(x => new RecentActivity(
                x.Action, x.EntityType, x.EntityId,
                $"{x.AdminEmail} {x.Action.ToLower().Replace("_", " ")} {x.EntityType} #{x.EntityId}",
                x.CreatedAt
            ))
            .ToListAsync();

        var userStats = new List<DailyStat>();
        var dealStats = new List<DailyStat>();

        return new DashboardKpis(
            TotalUsers: totalUsers,
            ActiveDeals: activeDeals,
            OrdersToday: ordersToday,
            TodayRevenue: todayRevenue,
            PendingModeration: 0,
            NewUsersToday: newUsersToday,
            GrowthPercent: 0,
            UserStats: userStats,
            DealStats: dealStats,
            RecentActivity: recentActivity
        );
    }
}
