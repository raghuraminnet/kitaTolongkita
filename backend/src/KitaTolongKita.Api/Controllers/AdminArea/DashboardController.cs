using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Infrastructure.Data;

namespace KitaTolongKita.Api.Controllers.AdminArea;

[ApiController]
[Route("api/dashboard")]
[Authorize(AuthenticationSchemes = "AdminJwt", Policy = "Viewer")]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<DashboardController> _logger;

    public DashboardController(AppDbContext db, ILogger<DashboardController> logger)
    {
        _db = db;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var now = DateTime.UtcNow;
        var today = now.Date;
        var thirtyDaysAgo = today.AddDays(-30);

        // ── User KPIs ─────────────────────────────────────────────────────────
        var totalUsers = await _db.Users.CountAsync();
        var newUsersToday = await _db.Users.CountAsync(u => u.CreatedAt >= today);
        var yesterday = today.AddDays(-1);
        var newUsersYesterday = await _db.Users.CountAsync(u => u.CreatedAt >= yesterday && u.CreatedAt < today);
        var growthPercent = newUsersYesterday > 0
            ? Math.Round((double)(newUsersToday - newUsersYesterday) / newUsersYesterday * 100, 1)
            : (newUsersToday > 0 ? 100.0 : 0.0);

        // ── Deal KPIs ─────────────────────────────────────────────────────────
        var activeDeals = await _db.Deals.CountAsync(d => d.Status == DealStatus.Active);
        var pendingModeration = await _db.Deals.CountAsync(d =>
            d.ModerationStatus == ModerationStatus.Pending || d.ModerationStatus == ModerationStatus.UnderReview);

        // ── Order KPIs ────────────────────────────────────────────────────────
        var ordersToday = await _db.DealOrders.CountAsync(o => o.CreatedAt >= today);
        var todayRevenue = await _db.DealOrders
            .Where(o => o.CreatedAt >= today)
            .SumAsync(o => (decimal?)o.TotalPrice) ?? 0;

        // ── Daily stats (30 days) ─────────────────────────────────────────────
        // Note: Date formatting done client-side because EF Core can't translate
        // DateTime.ToString(format) in a LINQ expression tree to SQL.
        var userDailyRaw = await _db.Users
            .Where(u => u.CreatedAt >= thirtyDaysAgo)
            .GroupBy(u => u.CreatedAt.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .ToListAsync();
        var userDaily = userDailyRaw
            .Select(x => new DailyStat(x.Date.ToString("yyyy-MM-dd"), x.Count))
            .OrderBy(x => x.Date)
            .ToList();

        var dealDailyRaw = await _db.Deals
            .Where(d => d.CreatedAt >= thirtyDaysAgo)
            .GroupBy(d => d.CreatedAt.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .ToListAsync();
        var dealDaily = dealDailyRaw
            .Select(x => new DailyStat(x.Date.ToString("yyyy-MM-dd"), x.Count))
            .OrderBy(x => x.Date)
            .ToList();

        // ── Recent admin actions ───────────────────────────────────────────────
        var recentActivity = await _db.AuditLogs
            .OrderByDescending(x => x.CreatedAt)
            .Take(10)
            .Select(x => new RecentActivity(
                x.Action, x.EntityType, x.EntityId,
                $"{x.AdminEmail} {x.Action.ToLower().Replace("_", " ")} {x.EntityType} #{x.EntityId}",
                x.CreatedAt))
            .ToListAsync();

        var kpis = new DashboardKpis(
            TotalUsers: totalUsers,
            ActiveDeals: activeDeals,
            OrdersToday: ordersToday,
            TodayRevenue: todayRevenue,
            PendingModeration: pendingModeration,
            NewUsersToday: newUsersToday,
            GrowthPercent: (decimal)growthPercent,
            UserStats: userDaily,
            DealStats: dealDaily,
            RecentActivity: recentActivity
        );

        return Ok(new AdminApiResponse(true, null, kpis));
    }
}
