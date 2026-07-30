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
    private readonly MainDbContext _mainDb;

    public DashboardService(AdminDbContext db, MainDbContext mainDb)
    {
        _db = db;
        _mainDb = mainDb;
    }

    public async Task<DashboardKpis> GetKpisAsync()
    {
        var today = DateTime.UtcNow.Date;
        var weekAgo = today.AddDays(-7);

        // KPIs from main database
        var totalUsers = await _mainDb.Users.CountAsync();
        var activeDeals = await _mainDb.Deals.CountAsync(d => d.ModerationStatus == "Approved");
        var ordersToday = await _mainDb.Orders.CountAsync(o => o.CreatedAt >= today);
        var newUsersToday = await _mainDb.Users.CountAsync(u => u.CreatedAt >= today);
        var pendingModeration = await _mainDb.Deals.CountAsync(d =>
            d.ModerationStatus == "PendingReview" || d.ModerationStatus == "UnderReview" || d.ModerationStatus == "Pending");

        // Revenue today
        var todayOrders = await _mainDb.Orders
            .Where(o => o.CreatedAt >= today)
            .ToListAsync();
        var todayRevenue = todayOrders.Sum(o => o.Amount * o.Quantity);

        // 7-day user growth
        var weekAgoUsers = await _mainDb.Users.CountAsync(u => u.CreatedAt < weekAgo);
        var growthPercent = weekAgoUsers > 0
            ? Math.Round((decimal)(totalUsers - weekAgoUsers) / weekAgoUsers * 100, 1)
            : 0;

        // User stats (last 7 days)
        var userStats = new List<DailyStat>();
        for (var d = weekAgo; d <= today; d = d.AddDays(1))
        {
            var count = await _mainDb.Users.CountAsync(u => u.CreatedAt.Date == d);
            userStats.Add(new DailyStat(d.ToString("yyyy-MM-dd"), count));
        }

        // Deal stats (last 7 days)
        var dealStats = new List<DailyStat>();
        for (var d = weekAgo; d <= today; d = d.AddDays(1))
        {
            var count = await _mainDb.Deals.CountAsync(de => de.CreatedAt.Date == d);
            dealStats.Add(new DailyStat(d.ToString("yyyy-MM-dd"), count));
        }

        // Recent admin actions
        var recentActivity = await _db.AuditLogs
            .OrderByDescending(x => x.CreatedAt)
            .Take(10)
            .Select(x => new RecentActivity(
                x.Action, x.EntityType, x.EntityId,
                $"{x.AdminEmail} {x.Action.ToLower().Replace("_", " ")} {x.EntityType} #{x.EntityId}",
                x.CreatedAt
            ))
            .ToListAsync();

        return new DashboardKpis(
            TotalUsers: totalUsers,
            ActiveDeals: activeDeals,
            OrdersToday: ordersToday,
            TodayRevenue: todayRevenue,
            PendingModeration: pendingModeration,
            NewUsersToday: newUsersToday,
            GrowthPercent: growthPercent,
            UserStats: userStats,
            DealStats: dealStats,
            RecentActivity: recentActivity
        );
    }
}
