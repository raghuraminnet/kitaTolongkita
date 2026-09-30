using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Infrastructure.Data;
using KitaTolongKita.Infrastructure.Services;

namespace KitaTolongKita.Api.Controllers.AdminArea;

/// <summary>
/// Admin portal data endpoints — directly reads/writes the main DB.
/// Uses [Authorize(Policy = "AdminOrInternal")] which accepts either:
///   - AdminJwt (admin portal browser session)
///   - InternalApiKey (internal service calls, e.g. future microservices)
/// 
/// This avoids duplicating the same query logic that existed in InternalAdminController.
/// All endpoints here do direct DB access — zero HTTP overhead.
/// </summary>
[ApiController]
[Route("api/admin-portal")]
[Authorize(Policy = "AdminOrInternal")]
#pragma warning disable IDE0055 // Disabling formatter for this file
public class AdminPortalController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<AdminPortalController> _logger;
    private readonly IPushNotificationService _push;
    private readonly IAdminAlertService _adminAlerts;
    private readonly IElasticsearchService _es;

    public AdminPortalController(
        AppDbContext db,
        ILogger<AdminPortalController> logger,
        IPushNotificationService push,
        IAdminAlertService adminAlerts,
        IElasticsearchService es)
    {
        _db = db;
        _logger = logger;
        _push = push;
        _adminAlerts = adminAlerts;
        _es = es;
    }

    private object Paged<T>(List<T> items, int total, int page, int pageSize) =>
        new { items, totalCount = total, page, pageSize, totalPages = (int)Math.Ceiling(total / (double)pageSize) };

    // ── USERS ─────────────────────────────────────────────────────────────────

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

        if (filter == "verified") q = q.Where(u => u.EmailVerified);
        else if (filter == "unverified") q = q.Where(u => !u.EmailVerified);
        else if (filter == "active") q = q.Where(u => u.Status == UserStatus.Active);
        else if (filter == "inactive") q = q.Where(u => u.Status != UserStatus.Active);

        var total = await q.CountAsync();
        var users = await q
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(u => new {
                u.Id, u.FullName, u.Email, u.Phone, u.EmailVerified,
                Status = u.Status.ToString(), u.IsContributor, u.CreatedAt, u.LastLoginAt
            }).ToListAsync();

        return Ok(Paged(users, total, page, pageSize));
    }

    [HttpGet("users/{id:guid}")]
    public async Task<IActionResult> GetUser(Guid id)
    {
        var u = await _db.Users.FindAsync(id);
        if (u == null) return NotFound();

        return Ok(new {
            u.Id, u.FullName, u.Email, u.Phone, u.EmailVerified,
            Status = u.Status.ToString(), u.IsContributor,
            u.Bio, u.City, u.Website, u.AvatarUrl,
            u.CreatedAt, u.LastLoginAt,
            stats = new {
                totalDeals    = await _db.Deals.CountAsync(d => d.OrganizerId == id),
                totalOrders   = await _db.DealOrders.CountAsync(o => o.BuyerId == id),
                totalSaved    = await _db.SavedDeals.CountAsync(s => s.UserId == id),
                totalReposts  = await _db.DealReposts.CountAsync(r => r.UserId == id),
                followers     = await _db.UserFollows.CountAsync(f => f.FollowingId == id),
                following     = await _db.UserFollows.CountAsync(f => f.FollowerId == id),
            }
        });
    }

    [HttpPatch("users/{id:guid}/status")]
    public async Task<IActionResult> ToggleUserStatus(Guid id, [FromBody] ToggleStatusRequest body)
    {
        var u = await _db.Users.FindAsync(id);
        if (u == null) return NotFound();
        u.Status = body.IsActive ? UserStatus.Active : UserStatus.Deleted;
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

    [HttpGet("users/{userId:guid}/follow-stats")]
    public async Task<IActionResult> GetFollowStats(Guid userId)
    {
        var followers = await _db.UserFollows.CountAsync(f => f.FollowingId == userId);
        var following = await _db.UserFollows.CountAsync(f => f.FollowerId == userId);
        return Ok(new { followers, following });
    }

    [HttpGet("users/{userId:guid}/followers")]
    public async Task<IActionResult> GetFollowers(Guid userId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var q = _db.UserFollows.Include(f => f.Follower).Where(f => f.FollowingId == userId);
        var total = await q.CountAsync();
        var items = await q.OrderByDescending(f => f.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(f => new { f.FollowerId, FullName = f.Follower.FullName, AvatarUrl = f.Follower.AvatarUrl, f.CreatedAt })
            .ToListAsync();
        return Ok(Paged(items, total, page, pageSize));
    }

    [HttpGet("users/{userId:guid}/following")]
    public async Task<IActionResult> GetFollowing(Guid userId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var q = _db.UserFollows.Include(f => f.Following).Where(f => f.FollowerId == userId);
        var total = await q.CountAsync();
        var items = await q.OrderByDescending(f => f.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(f => new { f.FollowingId, FullName = f.Following.FullName, AvatarUrl = f.Following.AvatarUrl, f.CreatedAt })
            .ToListAsync();
        return Ok(Paged(items, total, page, pageSize));
    }

    [HttpGet("users/{userId:guid}/activity")]
    public async Task<IActionResult> GetUserActivity(Guid userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        var deals = await _db.Deals.Where(d => d.OrganizerId == userId)
            .OrderByDescending(d => d.CreatedAt).Take(20)
            .Select(d => new { Id = d.Id.ToString(), Title = d.Title, Status = d.Status.ToString(), CreatedAt = d.CreatedAt })
            .ToListAsync();

        var orders = await _db.DealOrders.Where(o => o.BuyerId == userId)
            .Include(o => o.Deal).OrderByDescending(o => o.CreatedAt).Take(20)
            .Select(o => new { o.Id, DealTitle = o.Deal != null ? o.Deal.Title : "", Status = o.Status.ToString(), o.TotalPrice, CreatedAt = o.CreatedAt })
            .ToListAsync();

        var comments = await _db.DealComments.Where(c => c.UserId == userId)
            .OrderByDescending(c => c.CreatedAt).Take(10)
            .Select(c => new { c.Id, Content = c.Content, CreatedAt = c.CreatedAt })
            .ToListAsync();

        return Ok(new {
            Id = user.Id.ToString(), user.Email, user.FullName,
            DealsPosted = deals, Orders = orders, RecentComments = comments
        });
    }

    [HttpGet("users/{userId:guid}/recent-activity")]
    public async Task<IActionResult> GetRecentActivity(Guid userId, [FromQuery] int limit = 50)
    {
        var logs = await _db.ActivityLogs.Where(l => l.UserId == userId)
            .OrderByDescending(l => l.CreatedAt).Take(limit)
            .Select(l => new { l.Id, l.Action, l.Message, l.EntityType, l.EntityId, l.CreatedAt })
            .ToListAsync();
        return Ok(new { items = logs, count = logs.Count });
    }

    // ── APP DEALS (read-only view of all deals) ──────────────────────────────

    [HttpGet("app-deals")]
    public async Task<IActionResult> GetAppDeals(
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var q = _db.Deals.Include(d => d.Organizer).AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<DealStatus>(status, true, out var ds))
            q = q.Where(d => d.Status == ds);
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(d => d.Title.Contains(search) || d.Description.Contains(search));

        var total = await q.CountAsync();
        var deals = await q.OrderByDescending(d => d.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(d => new {
                d.Id, d.Title, d.Description, d.Category,
                d.OriginalPrice, d.GroupPrice, d.MinMembers, d.MaxMembers,
                Deadline = d.Deadline, d.PickupLocation, d.ImageUrls,
                Status = d.Status.ToString(),
                ModerationStatus = d.ModerationStatus.ToString(),
                d.ModerationScore, d.ModerationRejectReason,
                d.UpvoteCount, d.LikeCount,
                OrganizerId = d.OrganizerId,
                OrganizerName = d.Organizer != null ? d.Organizer.FullName : null,
                d.CreatedAt, d.PublishedAt
            }).ToListAsync();

        return Ok(Paged(deals, total, page, pageSize));
    }

    [HttpGet("app-deals/{id:guid}")]
    public async Task<IActionResult> GetAppDeal(Guid id)
    {
        var d = await _db.Deals.Include(x => x.Organizer).FirstOrDefaultAsync(x => x.Id == id);
        if (d == null) return NotFound();
        return Ok(new {
            d.Id, d.Title, d.Description, d.Category,
            d.OriginalPrice, d.GroupPrice, d.MinMembers, d.MaxMembers,
            d.Deadline, d.PickupLocation, d.ImageUrls,
            Status = d.Status.ToString(),
            ModerationStatus = d.ModerationStatus.ToString(),
            d.ModerationScore, d.ModerationRejectReason,
            d.UpvoteCount, d.LikeCount, d.Hashtags,
            OrganizerId = d.OrganizerId,
            OrganizerName = d.Organizer != null ? d.Organizer.FullName : null,
            d.CreatedAt, d.PublishedAt
        });
    }

    // ── APP USERS (read-only view of all users) ──────────────────────────────

    [HttpGet("app-users")]
    public async Task<IActionResult> GetAppUsers(
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var q = _db.Users.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(u => u.Email.Contains(search) || (u.FullName != null && u.FullName.Contains(search)));

        var total = await q.CountAsync();
        var users = await q.OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(u => new { u.Id, u.FullName, u.Email, u.Phone, u.AvatarUrl, u.EmailVerified, u.CreatedAt, u.LastLoginAt, Status = u.Status.ToString() })
            .ToListAsync();
        return Ok(Paged(users, total, page, pageSize));
    }

    [HttpGet("app-users/{id:guid}")]
    public async Task<IActionResult> GetAppUser(Guid id)
    {
        var u = await _db.Users.FindAsync(id);
        if (u == null) return NotFound();
        return Ok(new { u.Id, u.FullName, u.Email, u.Phone, u.AvatarUrl, u.EmailVerified, u.CreatedAt, u.LastLoginAt, Status = u.Status.ToString() });
    }

    // ── DEALS ─────────────────────────────────────────────────────────────────

    [HttpGet("deals")]
    public async Task<IActionResult> GetDeals(
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var q = _db.Deals.Include(d => d.Organizer).AsQueryable();
        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<DealStatus>(status, true, out var ds))
            q = q.Where(d => d.Status == ds);
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(d => d.Title.Contains(search) || d.Description.Contains(search));

        var total = await q.CountAsync();
        var deals = await q.OrderByDescending(d => d.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(d => new {
                d.Id, d.Title, d.Category, d.GroupPrice, d.OriginalPrice,
                Status = d.Status.ToString(),
                ModerationStatus = d.ModerationStatus.ToString(),
                d.CreatedAt,
                OrganizerName = d.Organizer != null ? d.Organizer.FullName : null
            }).ToListAsync();
        return Ok(Paged(deals, total, page, pageSize));
    }

    // ── MODERATION ───────────────────────────────────────────────────────────

    [HttpGet("deals/moderation/pending")]
    public async Task<IActionResult> GetPendingDeals([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var q = _db.Deals.Include(d => d.Organizer)
            .Where(d => d.ModerationStatus == ModerationStatus.UnderReview
                     || d.ModerationStatus == ModerationStatus.Pending)
            .OrderByDescending(d => d.CreatedAt);

        var total = await q.CountAsync();
        var deals = await q.Skip((page - 1) * pageSize).Take(pageSize)
            .Select(d => new {
                d.Id, d.Title, d.Category, d.GroupPrice, d.OriginalPrice,
                d.ModerationScore,
                ModerationStatus = d.ModerationStatus.ToString(),
                OrganizerName = d.Organizer != null ? d.Organizer.FullName : null,
                d.CreatedAt
            }).ToListAsync();
        return Ok(Paged(deals, total, page, pageSize));
    }

    [HttpPost("deals/moderation/{id:guid}/approve")]
    public async Task<IActionResult> ApproveDeal(Guid id)
    {
        var deal = await _db.Deals.FindAsync(id);
        if (deal == null) return NotFound();
        deal.ModerationStatus = ModerationStatus.Approved;
        deal.ModerationRejectReason = null;
        deal.Status = DealStatus.Active;
        await _db.SaveChangesAsync();

        // Sync to Elasticsearch so the approved deal immediately appears in search
        try { await _es.RefreshDealIndexAsync(deal.Id); }
        catch (Exception ex) { _logger.LogWarning(ex, "Failed to sync deal {DealId} to ES after admin approve", deal.Id); }

        if (deal.OrganizerId.HasValue)
        {
            await _push.SendAndStoreAsync(
                deal.OrganizerId.Value,
                "deal_approved",
                "Deal Approved! 🎉",
                $"Your deal '{deal.Title}' has been approved and is now live.",
                new { dealId = deal.Id, type = "deal" });
        }

        return Ok(new { success = true, message = "Deal approved and published." });
    }

    [HttpPost("deals/moderation/{id:guid}/reject")]
    public async Task<IActionResult> RejectDeal(Guid id, [FromBody] AdminPortalRejectRequest? body)
    {
        var deal = await _db.Deals.FindAsync(id);
        if (deal == null) return NotFound();
        deal.ModerationStatus = ModerationStatus.Rejected;
        deal.ModerationRejectReason = body?.Reason ?? "Rejected by administrator.";
        deal.Status = DealStatus.Cancelled;
        await _db.SaveChangesAsync();

        // Sync to Elasticsearch so rejected deal disappears from search
        try { await _es.RefreshDealIndexAsync(deal.Id); }
        catch (Exception ex) { _logger.LogWarning(ex, "Failed to sync deal {DealId} to ES after admin reject", deal.Id); }

        if (deal.OrganizerId.HasValue)
        {
            await _push.SendAndStoreAsync(
                deal.OrganizerId.Value,
                "deal_rejected",
                "Deal Moderation Update",
                $"Your deal '{deal.Title}' was declined: {deal.ModerationRejectReason}",
                new { dealId = deal.Id, type = "deal" });
        }

        return Ok(new { success = true, message = "Deal rejected." });
    }

    [HttpPatch("deals/{id:guid}/feature")]
    public async Task<IActionResult> FeatureDeal(Guid id, [FromBody] AdminPortalFeatureRequest? body)
    {
        var deal = await _db.Deals.FindAsync(id);
        if (deal == null) return NotFound();
        await _db.SaveChangesAsync();
        return Ok(new { success = true, message = "Deal updated." });
    }

    // ── ORDERS ───────────────────────────────────────────────────────────────

    [HttpGet("orders")]
    public async Task<IActionResult> GetOrders(
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var q = _db.DealOrders.Include(o => o.Deal).AsQueryable();
        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<OrderStatus>(status, true, out var os))
            q = q.Where(o => o.Status == os);
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(o => o.Deal != null && o.Deal.Title.Contains(search));

        var total = await q.CountAsync();
        var orders = await q.OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(o => new {
                o.Id, o.DealId, o.BuyerId,
                Status = o.Status.ToString(), o.Quantity, o.TotalPrice,
                DealTitle = o.Deal != null ? o.Deal.Title : null,
                o.CreatedAt
            }).ToListAsync();
        return Ok(Paged(orders, total, page, pageSize));
    }

    [HttpGet("orders/{id:guid}")]
    public async Task<IActionResult> GetOrder(Guid id)
    {
        var o = await _db.DealOrders.Include(x => x.Deal).FirstOrDefaultAsync(x => x.Id == id);
        if (o == null) return NotFound();
        return Ok(new {
            o.Id, o.DealId, o.BuyerId,
            Status = o.Status.ToString(), o.Quantity, o.TotalPrice, o.Notes,
            DealTitle = o.Deal != null ? o.Deal.Title : null,
            o.CreatedAt, o.ConfirmedAt
        });
    }

    [HttpPatch("orders/{id:guid}/status")]
    public async Task<IActionResult> UpdateOrderStatus(Guid id, [FromBody] UpdateOrderStatusRequest body)
    {
        var o = await _db.DealOrders.Include(x => x.Deal).FirstOrDefaultAsync(x => x.Id == id);
        if (o == null) return NotFound();
        if (Enum.TryParse<OrderStatus>(body.Status, true, out var s)) o.Status = s;
        await _db.SaveChangesAsync();

        var statusEmoji = body.Status.ToLowerInvariant() switch
        {
            "confirmed" => "🛍️",
            "shipped" or "outfordelivery" => "🚚",
            "delivered" => "✅",
            "cancelled" => "⚠️",
            _ => "📦"
        };

        await _push.SendAndStoreAsync(
            o.BuyerId,
            "order_update",
            $"Order {body.Status} {statusEmoji}",
            $"Your order for '{(o.Deal != null ? o.Deal.Title : "Deal")}' is now {body.Status}.",
            new { orderId = o.Id, type = "order", status = body.Status });

        return Ok(new { message = "Order status updated." });
    }

    // ── SAVED LISTS ─────────────────────────────────────────────────────────

    [HttpGet("saved-lists")]
    public async Task<IActionResult> GetSavedLists([FromQuery] string? search = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var q = _db.SavedLists.Include(s => s.User).AsQueryable();
        if (!string.IsNullOrWhiteSpace(search)) q = q.Where(s => s.Name.Contains(search));
        var total = await q.CountAsync();
        var lists = await q.OrderByDescending(s => s.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(s => new {
                s.Id, s.Name, s.IsPublic, s.CreatedAt,
                UserName = s.User != null ? s.User.FullName : null,
                DealCount = s.SavedDeals.Count
            }).ToListAsync();
        return Ok(Paged(lists, total, page, pageSize));
    }

    [HttpGet("saved-lists/{id:guid}")]
    public async Task<IActionResult> GetSavedList(Guid id)
    {
        var s = await _db.SavedLists.Include(x => x.User).Include(x => x.SavedDeals).ThenInclude(sd => sd.Deal).FirstOrDefaultAsync(x => x.Id == id);
        if (s == null) return NotFound();
        return Ok(new {
            s.Id, s.Name, s.IsPublic, s.CreatedAt,
            UserName = s.User != null ? s.User.FullName : null,
            Deals = s.SavedDeals.Select(sd => new { sd.DealId, Title = sd.Deal != null ? sd.Deal.Title : null, sd.SavedAt }).ToList()
        });
    }

    // ── NOTIFICATIONS ───────────────────────────────────────────────────────

    [HttpGet("notifications")]
    public async Task<IActionResult> GetNotifications([FromQuery] string? type = null, [FromQuery] bool? isRead = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var q = _db.UserNotifications.AsQueryable();
        if (!string.IsNullOrWhiteSpace(type)) q = q.Where(n => n.Type == type);
        if (isRead.HasValue) q = q.Where(n => n.IsRead == isRead.Value);
        var total = await q.CountAsync();
        var notifs = await q.OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(n => new { n.Id, n.UserId, n.Type, n.Title, n.Body, n.IsRead, n.CreatedAt })
            .ToListAsync();
        return Ok(Paged(notifs, total, page, pageSize));
    }

    [HttpGet("notifications/stats")]
    public async Task<IActionResult> GetNotificationStats()
    {
        var total = await _db.UserNotifications.CountAsync();
        var unread = await _db.UserNotifications.CountAsync(n => !n.IsRead);
        return Ok(new { total, unread });
    }

    // ── CONVERSATIONS ───────────────────────────────────────────────────────

    [HttpGet("conversations")]
    public async Task<IActionResult> GetConversations([FromQuery] string? search = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var q = _db.Conversations.Include(c => c.Participants).ThenInclude(p => p.User).AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(c => c.Participants.Any(p => p.User.Email.Contains(search)));
        var total = await q.CountAsync();
        var convs = await q.OrderByDescending(c => c.LastMessageAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(c => new { c.Id, c.LastMessageAt, ParticipantCount = c.Participants.Count() }).ToListAsync();
        return Ok(Paged(convs, total, page, pageSize));
    }

    [HttpGet("conversations/{id:guid}/messages")]
    public async Task<IActionResult> GetMessages(Guid id, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var q = _db.ChatMessages.Where(m => m.ConversationId == id);
        var total = await q.CountAsync();
        var msgs = await q.OrderByDescending(m => m.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(m => new { m.Id, m.SenderId, m.Content, m.CreatedAt }).ToListAsync();
        return Ok(Paged(msgs, total, page, pageSize));
    }

    // ── PUSH TOKENS ────────────────────────────────────────────────────────

    [HttpGet("push-tokens")]
    public async Task<IActionResult> GetPushTokens([FromQuery] string? search = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var q = _db.PushTokens.AsQueryable();
        var total = await q.CountAsync();
        var tokens = await q.OrderByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(t => new { t.Id, t.UserId, t.Token, t.Platform, t.IsActive, t.CreatedAt }).ToListAsync();
        return Ok(Paged(tokens, total, page, pageSize));
    }

    // ── STATS ───────────────────────────────────────────────────────────────

    [HttpGet("stats/deals")]
    public async Task<IActionResult> GetDealStats([FromQuery] int days = 30)
    {
        var since = DateTime.UtcNow.AddDays(-days);
        var deals = await _db.Deals.Where(d => d.CreatedAt >= since).ToListAsync();
        return Ok(new {
            byCategory = deals.GroupBy(d => d.Category).Select(g => new { category = g.Key, count = g.Count() }).ToList(),
            byStatus = deals.GroupBy(d => d.Status).Select(g => new { status = g.Key.ToString(), count = g.Count() }).ToList(),
            daily = deals.GroupBy(d => d.CreatedAt.Date).Select(g => new { date = g.Key, count = g.Count() }).OrderBy(x => x.date).ToList(),
            total = deals.Count
        });
    }

    // ── BULK ───────────────────────────────────────────────────────────────

    [HttpPost("bulk/moderate-deals")]
    public async Task<IActionResult> BulkModerateDeals([FromBody] BulkModerateRequest req)
    {
        var succeeded = 0; var failed = 0; var errors = new List<string>();
        foreach (var idStr in req.Ids)
        {
            if (!Guid.TryParse(idStr, out var id)) { failed++; errors.Add($"Invalid GUID: {idStr}"); continue; }
            var deal = await _db.Deals.FindAsync(id);
            if (deal == null) { failed++; errors.Add($"Deal not found: {idStr}"); continue; }

            if (req.Action == "approve")
            {
                deal.ModerationStatus = ModerationStatus.Approved;
                deal.Status = DealStatus.Active;
                _ = Task.Run(async () => { try { await _es.RefreshDealIndexAsync(deal.Id); } catch {} });
            }
            else if (req.Action == "reject")
            {
                deal.ModerationStatus = ModerationStatus.Rejected;
                deal.Status = DealStatus.Cancelled;
                deal.ModerationRejectReason = req.Reason;
                _ = Task.Run(async () => { try { await _es.RefreshDealIndexAsync(deal.Id); } catch {} });
            }
            succeeded++;
        }
        await _db.SaveChangesAsync();
        return Ok(new { succeeded, failed, errors });
    }

    // ── COMMENTS ───────────────────────────────────────────────────────────

    [HttpGet("comments")]
    public async Task<IActionResult> GetComments([FromQuery] string? dealId = null, [FromQuery] string? status = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var q = _db.DealComments.Include(c => c.Deal).Include(c => c.User).AsQueryable();
        if (!string.IsNullOrWhiteSpace(dealId) && Guid.TryParse(dealId, out var did)) q = q.Where(c => c.DealId == did);
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(c => c.ModerationStatus == status);
        var total = await q.CountAsync();
        var comments = await q.OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(c => new { c.Id, c.DealId, DealTitle = c.Deal != null ? c.Deal.Title : null, c.UserId, UserFullName = c.User != null ? c.User.FullName : null, c.Content, c.CreatedAt, c.ModerationStatus }).ToListAsync();
        return Ok(Paged(comments, total, page, pageSize));
    }

    [HttpGet("comments/stats")]
    public async Task<IActionResult> GetCommentStats()
    {
        var total = await _db.DealComments.CountAsync();
        var byStatus = await _db.DealComments.GroupBy(c => c.ModerationStatus).Select(g => new { status = g.Key, count = g.Count() }).ToListAsync();
        return Ok(new { total, byStatus });
    }

    [HttpPatch("comments/{id:guid}/hide")]
    public async Task<IActionResult> HideComment(Guid id)
    {
        var c = await _db.DealComments.FindAsync(id);
        if (c == null) return NotFound();
        c.ModerationStatus = "Hidden";
        await _db.SaveChangesAsync();
        return Ok(new { message = "Comment hidden." });
    }

    [HttpPatch("comments/{id:guid}/approve")]
    public async Task<IActionResult> ApproveComment(Guid id)
    {
        var c = await _db.DealComments.FindAsync(id);
        if (c == null) return NotFound();
        c.ModerationStatus = "Approved";
        await _db.SaveChangesAsync();
        return Ok(new { message = "Comment approved." });
    }

    [HttpDelete("comments/{id:guid}")]
    public async Task<IActionResult> DeleteComment(Guid id)
    {
        var c = await _db.DealComments.FindAsync(id);
        if (c == null) return NotFound();
        _db.DealComments.Remove(c);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Comment deleted." });
    }

    // ── ADMIN ALERTS ────────────────────────────────────────────────────────
    [HttpGet("alerts")]
    public async Task<IActionResult> GetAdminAlerts(
        [FromQuery] bool? isRead = null,
        [FromQuery] string? severity = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var (items, total, unreadCount) = await _adminAlerts.GetAlertsAsync(isRead, severity, page, pageSize);
        return Ok(new { items, totalCount = total, unreadCount, page, pageSize });
    }

    [HttpGet("alerts/unread-count")]
    public async Task<IActionResult> GetAdminAlertsUnreadCount()
    {
        var unreadCount = await _adminAlerts.GetUnreadCountAsync();
        return Ok(new { unreadCount });
    }

    [HttpPatch("alerts/{id:guid}/read")]
    public async Task<IActionResult> MarkAdminAlertRead(Guid id)
    {
        var ok = await _adminAlerts.MarkAsReadAsync(id);
        if (!ok) return NotFound();
        return Ok(new { success = true });
    }

    [HttpPost("alerts/read-all")]
    public async Task<IActionResult> MarkAllAdminAlertsRead()
    {
        var count = await _adminAlerts.MarkAllAsReadAsync();
        return Ok(new { success = true, count });
    }

    // ── PUSH TOOLS & BROADCASTING ──────────────────────────────────────────
    [HttpPost("push/broadcast")]
    public async Task<IActionResult> BroadcastPush([FromBody] BroadcastPushRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Title) || string.IsNullOrWhiteSpace(req.Body))
            return BadRequest(new { message = "Title and body are required." });

        var sentCount = await _push.BroadcastAsync(req.Title, req.Body, req.Data, req.TargetRole);
        return Ok(new { success = true, sentCount, message = $"Broadcast sent to {sentCount} active devices." });
    }

    [HttpPost("push/send-test")]
    public async Task<IActionResult> SendTestPush([FromBody] SendTestPushRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Token))
            return BadRequest(new { message = "Device push token is required." });

        var (success, message) = await _push.SendTestNotificationAsync(
            req.Token,
            req.Title ?? "KitaTolongKita Test Alert 🔔",
            req.Body ?? "This is a test notification from the Admin Portal.",
            req.Data);

        return Ok(new { success, message });
    }

    [HttpPost("push/send-to-user")]
    public async Task<IActionResult> SendPushToUser([FromBody] SendUserPushRequest req)
    {
        if (req.UserId == Guid.Empty || string.IsNullOrWhiteSpace(req.Title) || string.IsNullOrWhiteSpace(req.Body))
            return BadRequest(new { message = "UserId, title and body are required." });

        await _push.SendAndStoreAsync(req.UserId, "admin_message", req.Title, req.Body, req.Data);
        return Ok(new { success = true, message = "Notification sent to user devices." });
    }

    [HttpGet("push/stats")]
    public async Task<IActionResult> GetPushStats()
    {
        var totalTokens = await _db.PushTokens.CountAsync();
        var activeTokens = await _db.PushTokens.CountAsync(t => t.IsActive);
        var androidCount = await _db.PushTokens.CountAsync(t => t.Platform == "android" && t.IsActive);
        var iosCount = await _db.PushTokens.CountAsync(t => t.Platform == "ios" && t.IsActive);
        return Ok(new { totalTokens, activeTokens, androidCount, iosCount });
    }
}

// ── Shared request DTOs ─────────────────────────────────────────────────────
public record ToggleStatusRequest(bool IsActive);
public record VerifyUserRequest(bool Verify);
public record UpdateOrderStatusRequest(string Status);
public record BulkModerateRequest(List<string> Ids, string Action, string? Reason);
public record AdminPortalRejectRequest(string? Reason = null);
public record AdminPortalFeatureRequest(bool Featured = false);
public record BroadcastPushRequest(string Title, string Body, object? Data = null, string? TargetRole = null);
public record SendTestPushRequest(string Token, string? Title = null, string? Body = null, object? Data = null);
public record SendUserPushRequest(Guid UserId, string Title, string Body, object? Data = null);
