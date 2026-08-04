using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Infrastructure.Data;

namespace KitaTolongKita.Api.Controllers;

/// <summary>
/// Internal admin endpoints — called by the Admin API (port 5001) via MainApiClient.
/// Authenticated via X-Internal-Api-Key header (shared secret).
/// </summary>
[ApiController]
[Route("api/admin")]
[Authorize(AuthenticationSchemes = "InternalApiKey")]
public class InternalAdminController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<InternalAdminController> _logger;

    public InternalAdminController(AppDbContext db, ILogger<InternalAdminController> logger)
    {
        _db = db;
        _logger = logger;
    }

    private object Page(object items, int total, int page, int pageSize)
        => new { items, totalCount = total, page, pageSize, totalPages = (int)Math.Ceiling(total / (double)pageSize) };

    // ═══════════════════════════════════════════════════════════
    // USERS
    // ═══════════════════════════════════════════════════════════

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers(
        [FromQuery] string? search = null,
        [FromQuery] string? filter = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var q = _db.Users.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(u => u.Email.Contains(search) || (u.FullName != null && u.FullName.Contains(search)));

        if (filter == "verified")
            q = q.Where(u => u.EmailVerified);
        else if (filter == "unverified")
            q = q.Where(u => !u.EmailVerified);
        else if (filter == "active")
            q = q.Where(u => u.Status == UserStatus.Active);
        else if (filter == "inactive")
            q = q.Where(u => u.Status != UserStatus.Active);

        var total = await q.CountAsync();
        var users = await q
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new
            {
                u.Id,
                u.FullName,
                u.Email,
                u.Phone,
                u.EmailVerified,
                Status = u.Status.ToString(),
                u.IsContributor,
                u.CreatedAt,
                u.LastLoginAt
            })
            .ToListAsync();

        return Ok(Page(users, total, page, pageSize));
    }

    [HttpGet("users/{id:guid}")]
    public async Task<IActionResult> GetUser(Guid id)
    {
        var u = await _db.Users.FindAsync(id);
        if (u == null) return NotFound();

        return Ok(new
        {
            u.Id,
            u.FullName,
            u.Email,
            u.Phone,
            u.EmailVerified,
            Status = u.Status.ToString(),
            u.IsContributor,
            u.Bio,
            u.City,
            u.Website,
            u.CreatedAt,
            u.LastLoginAt
        });
    }

    [HttpPatch("users/{id:guid}/toggle-status")]
    public async Task<IActionResult> ToggleUserStatus(Guid id, [FromBody] ToggleStatusRequest body)
    {
        var u = await _db.Users.FindAsync(id);
        if (u == null) return NotFound();
        u.Status = body.IsActive ? UserStatus.Active : UserStatus.Inactive;
        await _db.SaveChangesAsync();
        return Ok(new { message = "User status updated." });
    }

    [HttpPatch("users/{id:guid}/verify")]
    public async Task<IActionResult> VerifyUser(Guid id, [FromBody] VerifyUserRequest body)
    {
        var u = await _db.Users.FindAsync(id);
        if (u == null) return NotFound();
        u.EmailVerified = body.Verify;
        await _db.SaveChangesAsync();
        return Ok(new { message = "User verification updated." });
    }

    // ═══════════════════════════════════════════════════════════
    // DEALS
    // ═══════════════════════════════════════════════════════════

    [HttpGet("deals")]
    public async Task<IActionResult> GetDeals(
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var q = _db.Deals.Include(d => d.Organizer).AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            if (Enum.TryParse<DealStatus>(status, true, out var ds))
                q = q.Where(d => d.Status == ds);

        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(d => d.Title.Contains(search) || d.Description.Contains(search));

        var total = await q.CountAsync();
        var deals = await q
            .OrderByDescending(d => d.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(d => new
            {
                d.Id,
                d.Title,
                d.Category,
                d.GroupPrice,
                d.OriginalPrice,
                Status = d.Status.ToString(),
                ModerationStatus = d.ModerationStatus.ToString(),
                d.CreatedAt,
                OrganizerName = d.Organizer != null ? d.Organizer.FullName : null
            })
            .ToListAsync();

        return Ok(Page(deals, total, page, pageSize));
    }

    [HttpGet("moderation/pending")]
    public async Task<IActionResult> GetPendingDeals([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var q = _db.Deals
            .Where(d => d.ModerationStatus == ModerationStatus.UnderReview
                     || d.ModerationStatus == ModerationStatus.Pending)
            .OrderByDescending(d => d.CreatedAt);

        var total = await q.CountAsync();
        var deals = await q
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(d => new
            {
                d.Id,
                d.Title,
                d.Category,
                d.GroupPrice,
                d.OriginalPrice,
                d.ModerationScore,
                ModerationStatus = d.ModerationStatus.ToString(),
                d.CreatedAt
            })
            .ToListAsync();

        return Ok(Page(deals, total, page, pageSize));
    }

    // ═══════════════════════════════════════════════════════════
    // ORDERS
    // ═══════════════════════════════════════════════════════════

    [HttpGet("orders")]
    public async Task<IActionResult> GetOrders(
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var q = _db.DealOrders
            .Include(o => o.Deal)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            if (Enum.TryParse<OrderStatus>(status, true, out var os))
                q = q.Where(o => o.Status == os);

        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(o => o.Deal != null && o.Deal.Title.Contains(search));

        var total = await q.CountAsync();
        var orders = await q
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(o => new
            {
                o.Id,
                o.DealId,
                o.BuyerId,
                Status = o.Status.ToString(),
                o.Quantity,
                o.TotalPrice,
                o.CreatedAt,
                DealTitle = o.Deal != null ? o.Deal.Title : null
            })
            .ToListAsync();

        return Ok(Page(orders, total, page, pageSize));
    }

    [HttpGet("orders/{id:guid}")]
    public async Task<IActionResult> GetOrder(Guid id)
    {
        var o = await _db.DealOrders
            .Include(x => x.Deal)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (o == null) return NotFound();

        return Ok(new
        {
            o.Id,
            o.DealId,
            o.BuyerId,
            Status = o.Status.ToString(),
            o.Quantity,
            o.TotalPrice,
            o.Notes,
            o.CreatedAt,
            o.ConfirmedAt,
            Deal = o.Deal != null ? new { o.Deal.Id, o.Deal.Title } : null
        });
    }

    [HttpPatch("orders/{id:guid}/status")]
    public async Task<IActionResult> UpdateOrderStatus(Guid id, [FromBody] UpdateOrderStatusRequest body)
    {
        var o = await _db.DealOrders.FindAsync(id);
        if (o == null) return NotFound();
        if (Enum.TryParse<OrderStatus>(body.Status, true, out var s))
            o.Status = s;
        await _db.SaveChangesAsync();
        return Ok(new { message = "Order status updated." });
    }

    // ═══════════════════════════════════════════════════════════
    // SAVED LISTS
    // ═══════════════════════════════════════════════════════════

    [HttpGet("saved-lists")]
    public async Task<IActionResult> GetSavedLists(
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var q = _db.SavedLists.Include(s => s.User).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(s => s.Name.Contains(search));

        var total = await q.CountAsync();
        var lists = await q
            .OrderByDescending(s => s.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new
            {
                s.Id,
                s.Name,
                s.IsPublic,
                s.CreatedAt,
                UserName = s.User != null ? s.User.FullName : null
            })
            .ToListAsync();

        return Ok(Page(lists, total, page, pageSize));
    }

    [HttpGet("saved-lists/{id:guid}")]
    public async Task<IActionResult> GetSavedList(Guid id)
    {
        var s = await _db.SavedLists
            .Include(x => x.SavedDeals)
            .ThenInclude(sd => sd.Deal)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (s == null) return NotFound();

        return Ok(new
        {
            s.Id,
            s.Name,
            s.IsPublic,
            s.CreatedAt,
            Deals = s.SavedDeals.Select(sd => new
            {
                sd.DealId,
                Title = sd.Deal != null ? sd.Deal.Title : null,
                sd.SavedAt
            }).ToList()
        });
    }

    // ═══════════════════════════════════════════════════════════
    // NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════

    [HttpGet("notifications")]
    public async Task<IActionResult> GetNotifications(
        [FromQuery] string? type = null,
        [FromQuery] bool? isRead = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var q = _db.UserNotifications.AsQueryable();

        if (!string.IsNullOrWhiteSpace(type))
            q = q.Where(n => n.Type == type);
        if (isRead.HasValue)
            q = q.Where(n => n.IsRead == isRead.Value);

        var total = await q.CountAsync();
        var notifs = await q
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => new
            {
                n.Id,
                n.Type,
                n.Title,
                n.Message,
                n.IsRead,
                n.CreatedAt,
                n.RelatedEntityId
            })
            .ToListAsync();

        return Ok(Page(notifs, total, page, pageSize));
    }

    [HttpGet("notifications/stats")]
    public async Task<IActionResult> GetNotificationStats()
    {
        var total = await _db.UserNotifications.CountAsync();
        var unread = await _db.UserNotifications.CountAsync(n => !n.IsRead);
        return Ok(new { total, unread });
    }

    // ═══════════════════════════════════════════════════════════
    // CONVERSATIONS / CHAT
    // ═══════════════════════════════════════════════════════════

    [HttpGet("conversations")]
    public async Task<IActionResult> GetConversations(
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var q = _db.Conversations.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(c => c.Participants.Any(p => p.User.Email.Contains(search)));

        var total = await q.CountAsync();
        var convs = await q
            .OrderByDescending(c => c.LastMessageAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new
            {
                c.Id,
                c.LastMessageAt,
                ParticipantCount = c.Participants.Count()
            })
            .ToListAsync();

        return Ok(Page(convs, total, page, pageSize));
    }

    [HttpGet("conversations/{id:guid}/messages")]
    public async Task<IActionResult> GetMessages(Guid id, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var q = _db.ChatMessages.Where(m => m.ConversationId == id);
        var total = await q.CountAsync();
        var msgs = await q
            .OrderByDescending(m => m.SentAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(m => new
            {
                m.Id,
                m.SenderId,
                m.Content,
                m.SentAt
            })
            .ToListAsync();

        return Ok(Page(msgs, total, page, pageSize));
    }

    // ═══════════════════════════════════════════════════════════
    // PUSH TOKENS
    // ═══════════════════════════════════════════════════════════

    [HttpGet("push-tokens")]
    public async Task<IActionResult> GetPushTokens(
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var q = _db.PushTokens.Include(t => t.User).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(t => t.User != null && t.User.Email.Contains(search));

        var total = await q.CountAsync();
        var tokens = await q
            .OrderByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new
            {
                t.Id,
                t.Token,
                t.Platform,
                t.IsActive,
                t.CreatedAt,
                UserEmail = t.User != null ? t.User.Email : null
            })
            .ToListAsync();

        return Ok(Page(tokens, total, page, pageSize));
    }

    // ═══════════════════════════════════════════════════════════
    // STATS
    // ═══════════════════════════════════════════════════════════

    [HttpGet("stats/deals")]
    public async Task<IActionResult> GetDealStats([FromQuery] int days = 30)
    {
        var since = DateTime.UtcNow.AddDays(-days);
        var deals = await _db.Deals.Where(d => d.CreatedAt >= since).ToListAsync();

        var byCategory = deals
            .GroupBy(d => d.Category)
            .Select(g => new { category = g.Key, count = g.Count() })
            .ToList();

        var byStatus = deals
            .GroupBy(d => d.Status)
            .Select(g => new { status = g.Key.ToString(), count = g.Count() })
            .ToList();

        var daily = deals
            .GroupBy(d => d.CreatedAt.Date)
            .Select(g => new { date = g.Key, count = g.Count() })
            .OrderBy(x => x.date)
            .ToList();

        return Ok(new { byCategory, byStatus, daily, total = deals.Count });
    }

    // ═══════════════════════════════════════════════════════════
    // REPORTS
    // ═══════════════════════════════════════════════════════════

    [HttpGet("reports")]
    public async Task<IActionResult> GetReports(
        [FromQuery] string? status = null,
        [FromQuery] string? type = null,
        [FromQuery] string? reason = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var q = _db.Reports.AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<ReportStatus>(status, true, out var rs))
            q = q.Where(r => r.Status == rs);
        if (!string.IsNullOrWhiteSpace(type) && Enum.TryParse<ReportType>(type, true, out var rt))
            q = q.Where(r => r.Type == rt);
        if (!string.IsNullOrWhiteSpace(reason))
            q = q.Where(r => r.Reason.Contains(reason));

        var total = await q.CountAsync();
        var reports = await q
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new
            {
                r.Id,
                Type = r.Type.ToString(),
                r.Reason,
                Status = r.Status.ToString(),
                r.CreatedAt
            })
            .ToListAsync();

        return Ok(Page(reports, total, page, pageSize));
    }

    [HttpGet("reports/stats")]
    public async Task<IActionResult> GetReportStats()
    {
        var total = await _db.Reports.CountAsync();
        var byStatus = await _db.Reports.GroupBy(r => r.Status).Select(g => new { status = g.Key.ToString(), count = g.Count() }).ToListAsync();
        var byType = await _db.Reports.GroupBy(r => r.Type).Select(g => new { type = g.Key.ToString(), count = g.Count() }).ToListAsync();
        return Ok(new { total, byStatus, byType });
    }

    // ═══════════════════════════════════════════════════════════
    // COMMENTS
    // ═══════════════════════════════════════════════════════════

    [HttpGet("comments")]
    public async Task<IActionResult> GetComments(
        [FromQuery] string? dealId = null,
        [FromQuery] string? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var q = _db.DealComments.AsQueryable();

        if (!string.IsNullOrWhiteSpace(dealId) && Guid.TryParse(dealId, out var did))
            q = q.Where(c => c.DealId == did);
        if (!string.IsNullOrWhiteSpace(status))
            q = q.Where(c => c.ModerationStatus == status);

        var total = await q.CountAsync();
        var comments = await q
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new
            {
                c.Id,
                c.DealId,
                c.UserId,
                c.Content,
                c.ModerationStatus,
                c.CreatedAt
            })
            .ToListAsync();

        return Ok(Page(comments, total, page, pageSize));
    }

    [HttpGet("comments/stats")]
    public async Task<IActionResult> GetCommentStats()
    {
        var total = await _db.DealComments.CountAsync();
        var byStatus = await _db.DealComments.GroupBy(c => c.ModerationStatus).Select(g => new { status = g.Key, count = g.Count() }).ToListAsync();
        return Ok(new { total, byStatus });
    }

    // ═══════════════════════════════════════════════════════════
    // USER ACTIVITY TIMELINE
    // ═══════════════════════════════════════════════════════════

    [HttpGet("users/{userId:guid}/activity")]
    public async Task<IActionResult> GetUserActivity(Guid userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        var totalDealsPosted = await _db.Deals.CountAsync(d => d.OrganizerId == userId);
        var totalOrdersPlaced = await _db.DealOrders.CountAsync(o => o.BuyerId == userId);
        var totalSavedDeals = await _db.SavedDeals.CountAsync(s => s.UserId == userId);
        var totalNotificationsReceived = await _db.UserNotifications.CountAsync(n => n.UserId == userId);

        var dealActivities = await _db.Deals
            .Where(d => d.OrganizerId == userId)
            .OrderByDescending(d => d.CreatedAt)
            .Take(10)
            .Select(d => new { type = "deal_posted", summary = $"Posted deal: {d.Title}", at = d.CreatedAt })
            .ToListAsync();

        return Ok(new
        {
            totalDealsPosted,
            totalOrdersPlaced,
            totalSavedDeals,
            totalNotificationsReceived,
            createdAt = user.CreatedAt,
            activities = dealActivities
        });
    }
}

public record ToggleStatusRequest(bool IsActive);
public record VerifyUserRequest(bool Verify);
public record UpdateOrderStatusRequest(string Status);
