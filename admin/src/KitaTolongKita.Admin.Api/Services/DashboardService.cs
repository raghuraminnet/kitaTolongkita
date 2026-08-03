using System.Text;
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
    private readonly IMainApiClient _api;
    private readonly IDistributedCache _cache;
    private readonly ILogger<DashboardService> _logger;
    private const string CacheKey = "admin:dashboard:kpis";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(2);

    public DashboardService(
        AdminDbContext db,
        IMainApiClient api,
        IDistributedCache cache,
        ILogger<DashboardService> logger)
    {
        _db = db;
        _api = api;
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

        // Compute fresh from Kita API
        var result = await ComputeKpisAsync();

        // Cache the result
        try
        {
            var json = JsonSerializer.Serialize(result);
            await _cache.SetAsync(CacheKey, Encoding.UTF8.GetBytes(json), new DistributedCacheEntryOptions
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
        // Get KPIs from Kita API dashboard endpoint
        DashboardKpis? apiKpis;
        try
        {
            apiKpis = await _api.GetDashboardKpisAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch dashboard KPIs from Kita API");
            throw;
        }

        // Recent admin actions from our own DB
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
            TotalUsers: apiKpis.TotalUsers,
            ActiveDeals: apiKpis.ActiveDeals,
            OrdersToday: apiKpis.OrdersToday,
            TodayRevenue: apiKpis.TodayRevenue,
            PendingModeration: apiKpis.PendingModeration,
            NewUsersToday: apiKpis.NewUsersToday,
            GrowthPercent: apiKpis.GrowthPercent,
            UserStats: apiKpis.UserStats,
            DealStats: apiKpis.DealStats,
            RecentActivity: recentActivity
        );
    }
}
