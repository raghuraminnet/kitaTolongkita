using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using KitaTolongKita.Admin.Api.Data;
using KitaTolongKita.Admin.Api.DTOs;

namespace KitaTolongKita.Admin.Api.Services;

public interface IDashboardService
{
    Task<DashboardKpis> GetKpisAsync();
    Task InvalidateCacheAsync();
}

public class DashboardService : IDashboardService
{
    private readonly AdminDbContext _db;
    private readonly MainDbContext _mainDb;
    private readonly IDistributedCache _cache;
    private readonly ILogger<DashboardService> _logger;
    private const string CacheKey = "admin:dashboard:kpis";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(2);

    public DashboardService(
        AdminDbContext db,
        MainDbContext mainDb,
        IDistributedCache cache,
        ILogger<DashboardService> logger)
    {
        _db = db;
        _mainDb = mainDb;
        _cache = cache;
        _logger = logger;
    }

    public async Task<DashboardKpis> GetKpisAsync()
    {
        // Try Redis first
        try
        {
            var cached = await _cache.GetStringAsync(CacheKey);
            if (!string.IsNullOrEmpty(cached))
            {
                var kpis = JsonSerializer.Deserialize<DashboardKpis>(cached);
                if (kpis != null)
                {
                    _logger.LogDebug("Dashboard KPIs served from cache");
                    return kpis;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis cache miss for dashboard KPIs");
        }

        // Compute fresh
        var result = await ComputeKpisAsync();

        // Cache the result
        try
        {
            var json = JsonSerializer.SerializeToUtf8(result);
            await _cache.SetAsync(CacheKey, json, new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = CacheDuration
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to cache dashboard KPIs");
        }

        return result;
    }

    public async Task InvalidateCacheAsync()
    {
        try { await _cache.RemoveAsync(CacheKey); }
        catch (Exception ex) { _logger.LogWarning(ex, "Failed to invalidate dashboard KPIs cache"); }
    }

    private async Task<DashboardKpis> ComputeKpisAsync()
    {
        var today = DateTime.UtcNow.Date;
        var weekAgo = today.AddDays(-7);

        // KPIs from main database — run in parallel
        var totalUsersTask = _mainDb.Users.CountAsync();
        var activeDealsTask = _mainDb.Deals.CountAsync(d => d.ModerationStatus == "Approved");
        var ordersTodayTask = _mainDb.Orders.CountAsync(o => o.CreatedAt >= today);
        var newUsersTodayTask = _mainDb.Users.CountAsync(u => u.CreatedAt >= today);
        var pendingModerationTask = _mainDb.Deals.CountAsync(d =>
            d.ModerationStatus == "PendingReview" || d.ModerationStatus == "UnderReview" || d.ModerationStatus == "Pending");

        await Task.WhenAll(totalUsersTask, activeDealsTask, ordersTodayTask, newUsersTodayTask, pendingModerationTask);

        var totalUsers = await totalUsersTask;
        var activeDeals = await activeDealsTask;
        var ordersToday = await ordersTodayTask;
        var newUsersToday = await newUsersTodayTask;
        var pendingModeration = await pendingModerationTask;

        // Revenue today
        var todayOrders = await _mainDb.Orders.Where(o => o.CreatedAt >= today).ToListAsync();
        var todayRevenue = todayOrders.Sum(o => o.TotalPrice);

        // 7-day user growth
        var weekAgoUsers = await _mainDb.Users.CountAsync(u => u.CreatedAt < weekAgo);
        var growthPercent = weekAgoUsers > 0
            ? Math.Round((decimal)(totalUsers - weekAgoUsers) / weekAgoUsers * 100, 1)
            : 0;

        // User stats (last 7 days) — single query
        var userStatsData = await _mainDb.Users
            .Where(u => u.CreatedAt >= weekAgo)
            .GroupBy(u => u.CreatedAt.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .ToListAsync();
        var userStats = Enumerable.Range(0, 8)
            .Select(i =>
            {
                var d = weekAgo.AddDays(i);
                var count = userStatsData.FirstOrDefault(x => x.Date == d)?.Count ?? 0;
                return new DailyStat(d.ToString("yyyy-MM-dd"), count);
            }).ToList();

        // Deal stats (last 7 days) — single query
        var dealStatsData = await _mainDb.Deals
            .Where(de => de.CreatedAt >= weekAgo)
            .GroupBy(de => de.CreatedAt.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .ToListAsync();
        var dealStats = Enumerable.Range(0, 8)
            .Select(i =>
            {
                var d = weekAgo.AddDays(i);
                var count = dealStatsData.FirstOrDefault(x => x.Date == d)?.Count ?? 0;
                return new DailyStat(d.ToString("yyyy-MM-dd"), count);
            }).ToList();

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
