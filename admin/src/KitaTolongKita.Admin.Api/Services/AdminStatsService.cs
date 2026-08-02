using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using KitaTolongKita.Admin.Api.Data;

namespace KitaTolongKita.Admin.Api.Services;

/// <summary>
/// Admin dashboard statistics with Redis caching for performance.
/// </summary>
public interface IAdminStatsService
{
    Task<DashboardStats> GetDashboardStatsAsync();
    Task InvalidateCacheAsync();
}

public record DashboardStats(
    int TotalUsers,
    int TotalDeals,
    int TotalOrders,
    int PendingModeration,
    int ApprovedDeals,
    int RejectedDeals,
    decimal TotalRevenue,
    int FeaturedDeals,
    int NewUsersToday,
    int NewDealsToday,
    int NewOrdersToday,
    DateTime GeneratedAt
);

public class AdminStatsService : IAdminStatsService
{
    private readonly MainDbContext _mainDb;
    private readonly AdminDbContext _adminDb;
    private readonly IDistributedCache _cache;
    private readonly ILogger<AdminStatsService> _logger;
    private const string CacheKey = "admin:dashboard:stats";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(2);

    public AdminStatsService(
        MainDbContext mainDb,
        AdminDbContext adminDb,
        IDistributedCache cache,
        ILogger<AdminStatsService> logger)
    {
        _mainDb = mainDb;
        _adminDb = adminDb;
        _cache = cache;
        _logger = logger;
    }

    public async Task<DashboardStats> GetDashboardStatsAsync()
    {
        // Try Redis first
        try
        {
            var cached = await _cache.GetStringAsync(CacheKey);
            if (!string.IsNullOrEmpty(cached))
            {
                var stats = JsonSerializer.Deserialize<DashboardStats>(cached);
                if (stats != null) return stats with { GeneratedAt = DateTime.UtcNow };
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis cache miss for dashboard stats");
        }

        // Compute fresh stats from DB
        var today = DateTime.UtcNow.Date;
        var statsResult = await ComputeStatsAsync(today);

        // Store in Redis
        try
        {
            var json = JsonSerializer.Serialize(statsResult);
            await _cache.SetStringAsync(CacheKey, json, new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = CacheDuration
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to cache dashboard stats");
        }

        return statsResult;
    }

    public async Task InvalidateCacheAsync()
    {
        try { await _cache.RemoveAsync(CacheKey); }
        catch (Exception ex) { _logger.LogWarning(ex, "Failed to invalidate dashboard stats cache"); }
    }

    private async Task<DashboardStats> ComputeStatsAsync(DateTime today)
    {
        var now = DateTime.UtcNow;

        // Run all count queries in parallel for speed
        var totalUsersTask = _mainDb.Users.CountAsync();
        var totalDealsTask = _mainDb.Deals.CountAsync();
        var totalOrdersTask = _mainDb.Orders.CountAsync();
        var pendingModTask = _mainDb.Deals.CountAsync(d =>
            d.ModerationStatus == "Pending" || d.ModerationStatus == "UnderReview" || d.ModerationStatus == "PendingReview");
        var approvedDealsTask = _mainDb.Deals.CountAsync(d => d.ModerationStatus == "Approved");
        var rejectedDealsTask = _mainDb.Deals.CountAsync(d => d.ModerationStatus == "Rejected");
        var totalRevenueTask = _mainDb.Orders.SumAsync(o => (decimal)o.TotalPrice);
        var featuredDealsTask = _mainDb.Deals.CountAsync(d => d.IsFeatured);
        var newUsersTodayTask = _mainDb.Users.CountAsync(u => u.CreatedAt >= today);
        var newDealsTodayTask = _mainDb.Deals.CountAsync(d => d.CreatedAt >= today);
        var newOrdersTodayTask = _mainDb.Orders.CountAsync(o => o.CreatedAt >= today);

        await Task.WhenAll(
            totalUsersTask, totalDealsTask, totalOrdersTask, pendingModTask,
            approvedDealsTask, rejectedDealsTask, totalRevenueTask,
            featuredDealsTask, newUsersTodayTask, newDealsTodayTask, newOrdersTodayTask
        );

        return new DashboardStats(
            await totalUsersTask,
            await totalDealsTask,
            await totalOrdersTask,
            await pendingModTask,
            await approvedDealsTask,
            await rejectedDealsTask,
            await totalRevenueTask,
            await featuredDealsTask,
            await newUsersTodayTask,
            await newDealsTodayTask,
            await newOrdersTodayTask,
            DateTime.UtcNow
        );
    }
}
