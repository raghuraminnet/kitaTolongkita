using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Core.Interfaces;
using KitaTolongKita.Infrastructure.Data;

namespace KitaTolongKita.Api.Controllers;

/// <summary>
/// Back-office admin endpoints for deal moderation review.
/// In Phase 1, any authenticated user can access — lock down to admin role before production.
/// </summary>
[ApiController]
[Route("api/admin/moderation")]
[Authorize] // TODO: add policy: require Role=Admin
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IElasticsearchService _es;
    private readonly ILogger<AdminController> _logger;

    public AdminController(AppDbContext db, IElasticsearchService es, ILogger<AdminController> logger)
    {
        _db = db;
        _es = es;
        _logger = logger;
    }

    /// <summary>List all deals pending AI or manual review.</summary>
    [HttpGet("pending")]
    public async Task<IActionResult> GetPendingDeals([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var query = _db.Deals
            .Include(d => d.Orders)
            .Where(d => d.ModerationStatus == ModerationStatus.UnderReview
                     || d.ModerationStatus == ModerationStatus.Pending)
            .OrderByDescending(d => d.CreatedAt);

        var total = await query.CountAsync();
        var deals = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = deals.Select(d => new
        {
            d.Id,
            d.Title,
            d.Category,
            d.GroupPrice,
            d.OriginalPrice,
            d.ModerationScore,
            d.ModerationFlags,
            d.ModerationStatus,
            d.ModerationRejectReason,
            d.CreatedAt,
            d.ImageUrls,
            d.Hashtags
        }).ToList();

        return Ok(new { items = dtos, total, page, pageSize });
    }

    /// <summary>Get a single deal's full moderation details for review.</summary>
    [HttpGet("{dealId:guid}")]
    public async Task<IActionResult> GetDealModerationDetails(Guid dealId)
    {
        var deal = await _db.Deals
            .Include(d => d.OrganizerId)
            .FirstOrDefaultAsync(d => d.Id == dealId);

        if (deal == null) return NotFound();

        var organizer = await _db.Users.FindAsync(deal.OrganizerId);

        return Ok(new
        {
            deal.Id,
            deal.Title,
            deal.Description,
            deal.Category,
            deal.OriginalPrice,
            deal.GroupPrice,
            deal.ModerationScore,
            deal.ModerationFlags,
            deal.ModerationStatus,
            deal.ModerationRejectReason,
            deal.ImageUrls,
            deal.Hashtags,
            deal.PickupLocation,
            deal.CreatedAt,
            Organizer = organizer == null ? null : new
            {
                organizer.Id,
                organizer.FullName,
                organizer.Email
            }
        });
    }

    /// <summary>Admin override — approve a deal manually.</summary>
    [HttpPost("{dealId:guid}/approve")]
    public async Task<IActionResult> ApproveDeal(Guid dealId, [FromBody] ApproveRejectRequest? body)
    {
        var deal = await _db.Deals.FindAsync(dealId);
        if (deal == null) return NotFound();

        var adminId = GetAdminId();
        deal.ModerationStatus = ModerationStatus.Approved;
        deal.ModerationRejectReason = null;
        await _db.SaveChangesAsync();

        try { await _es.UpdateDealAsync(deal); }
        catch (Exception ex) { _logger.LogWarning(ex, "ES update failed after admin approve"); }

        _logger.LogInformation("Admin {AdminId} approved deal {DealId}", adminId, dealId);
        return Ok(new { message = "Deal approved and published." });
    }

    /// <summary>Admin override — reject a deal with a reason.</summary>
    [HttpPost("{dealId:guid}/reject")]
    public async Task<IActionResult> RejectDeal(Guid dealId, [FromBody] ApproveRejectRequest body)
    {
        var deal = await _db.Deals.FindAsync(dealId);
        if (deal == null) return NotFound();

        var adminId = GetAdminId();
        deal.ModerationStatus = ModerationStatus.Rejected;
        deal.ModerationRejectReason = body?.Reason ?? "Rejected by administrator.";
        await _db.SaveChangesAsync();

        try { await _es.UpdateDealAsync(deal); }
        catch (Exception ex) { _logger.LogWarning(ex, "ES update failed after admin reject"); }

        _logger.LogInformation("Admin {AdminId} rejected deal {DealId}: {Reason}", adminId, dealId, body?.Reason);
        return Ok(new { message = "Deal rejected.", reason = deal.ModerationRejectReason });
    }

    /// <summary>Get moderation flags summary for all deals.</summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetModerationStats()
    {
        var stats = await _db.Deals
            .GroupBy(d => d.ModerationStatus)
            .Select(g => new { status = g.Key.ToString(), count = g.Count() })
            .ToListAsync();

        var flagStats = await _db.Deals
            .Where(d => d.ModerationFlags != null && d.ModerationFlags.Count > 0)
            .SelectMany(d => d.ModerationFlags)
            .GroupBy(f => f)
            .Select(g => new { flag = g.Key, count = g.Count() })
            .ToListAsync();

        var avgScore = await _db.Deals
            .Where(d => d.ModerationScore.HasValue)
            .AverageAsync(d => (double?)d.ModerationScore) ?? 0;

        return Ok(new
        {
            byStatus = stats,
            byFlag = flagStats,
            averageScore = Math.Round(avgScore, 1),
            totalDeals = await _db.Deals.CountAsync()
        });
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Guid? GetAdminId()
    {
        var idStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(idStr, out var id) ? id : null;
    }
}

public record ApproveRejectRequest(string? Reason = null);
