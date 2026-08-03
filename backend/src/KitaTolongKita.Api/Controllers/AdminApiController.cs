using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using KitaTolongKita.Core.DTOs;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Infrastructure.Data;

namespace KitaTolongKita.Api.Controllers;

/// <summary>
/// Internal admin API — used by the KitaTolongKita Admin Portal (port 5001).
/// All endpoints require either a valid admin JWT or the shared X-Internal-Api-Key header.
/// </summary>
[ApiController]
[Route("api/admin")]
[Authorize]
public class AdminApiController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<AdminApiController> _logger;

    public AdminApiController(AppDbContext db, ILogger<AdminApiController> logger)
    {
        _db = db;
        _logger = logger;
    }

    private int AdminId
    {
        get
        {
            var idStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(idStr, out var id) ? id : 0;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // USERS
    // ═══════════════════════════════════════════════════════════════

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers(
        [FromQuery] string? search = null,
        [FromQuery] string? filter = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var q = _db.Users.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(u => EF.Functions.ILike(u.Email, $"%{search}%") || EF.Functions.ILike(u.FullName, $"%{search}%"));
        if (filter == "verified") q = q.Where(u => u.EmailVerified);
        else if (filter == "unverified") q = q.Where(u => !u.EmailVerified);

        var total = await q.CountAsync();
        var users = await q.OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(u => (object)new
            {
                u.Id, u.Email, u.FullName, u.AvatarUrl,
                u.EmailVerified, u.IsVerified, u.IsContributor,
                u.CreatedAt, u.LastLoginAt,
                DealsPosted = _db.Deals.Count(d => d.OrganizerId == u.Id)
            })
            .ToListAsync();

        return Ok(new PagedResult<object>(users, total, page, pageSize, (int)Math.Ceiling(total / (double)pageSize)));
    }

    [HttpGet("users/{id:guid}")]
    public async Task<IActionResult> GetUserDetail(Guid id)
    {
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id);
        if (user == null) return NotFound();

        var deals = await _db.Deals
            .Where(d => d.OrganizerId == id)
            .OrderByDescending(d => d.CreatedAt).Take(20)
            .Select(d => (object)new { d.Id, d.Title, Status = d.ModerationStatus.ToString(), d.CreatedAt })
            .ToListAsync();

        var orders = await _db.DealOrders
            .Where(o => o.BuyerId == id)
            .OrderByDescending(o => o.CreatedAt).Take(20)
            .Include(o => o.Deal)
            .Select(o => (object)new { o.Id, DealTitle = o.Deal != null ? o.Deal.Title : "", Status = o.Status.ToString(), o.TotalPrice, o.CreatedAt })
            .ToListAsync();

        return Ok(new
        {
            user.Id, user.Email, user.FullName, user.AvatarUrl,
            user.EmailVerified, user.IsVerified, user.IsContributor,
            user.Bio, user.City, user.Website,
            user.CreatedAt, user.LastLoginAt,
            user.ContributorSince, user.ContributorRating,
            DealsPosted = deals, Orders = orders
        });
    }

    [HttpPatch("users/{id:guid}/toggle-status")]
    public async Task<IActionResult> ToggleUserStatus(Guid id, [FromBody] ToggleStatusRequest req)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();
        user.Status = req.IsActive ? UserStatus.Active : UserStatus.Suspended;
        await _db.SaveChangesAsync();
        _logger.LogInformation("Admin {AdminId} toggled user {UserId} active={IsActive}", AdminId, id, req.IsActive);
        return Ok(new { success = true });
    }

    [HttpPatch("users/{id:guid}/verify")]
    public async Task<IActionResult> VerifyUser(Guid id, [FromBody] VerifyUserRequest req)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();
        user.IsVerified = req.Verify;
        await _db.SaveChangesAsync();
        _logger.LogInformation("Admin {AdminId} set user {UserId} verified={Verify}", AdminId, id, req.Verify);
        return Ok(new { success = true });
    }

    // ═══════════════════════════════════════════════════════════════
    // DEALS
    // ═══════════════════════════════════════════════════════════════

    [HttpGet("deals")]
    public async Task<IActionResult> GetAllDeals(
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var q = _db.Deals.Include(d => d.Organizer).AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && status != "All")
            q = q.Where(d => d.ModerationStatus.ToString() == status);
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(d => EF.Functions.ILike(d.Title, $"%{search}%") || EF.Functions.ILike(d.Category, $"%{search}%"));

        var total = await q.CountAsync();
        var deals = await q.OrderByDescending(d => d.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(d => (object)new
            {
                d.Id, d.Title, d.Category,
                OrganizerName = d.Organizer != null ? d.Organizer.FullName : "",
                d.GroupPrice, d.MembersJoined, d.MinMembers,
                Status = d.ModerationStatus.ToString(), d.CreatedAt
            })
            .ToListAsync();

        return Ok(new PagedResult<object>(deals, total, page, pageSize, (int)Math.Ceiling(total / (double)pageSize)));
    }

    [HttpGet("deals/{id:guid}")]
    public async Task<IActionResult> GetDealDetail(Guid id)
    {
        var d = await _db.Deals.Include(x => x.Organizer).AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (d == null) return NotFound();
        return Ok(new
        {
            d.Id, d.Title, d.Description, d.Category,
            d.OriginalPrice, d.GroupPrice, d.MinMembers, d.MaxMembers,
            d.MembersJoined, d.Deadline, d.PickupLocation,
            d.ImageUrl, d.ImageUrls,
            Status = d.Status.ToString(),
            ModerationStatus = d.ModerationStatus.ToString(),
            d.ModerationScore, d.ModerationFlags, d.ModerationRejectReason,
            d.UpvoteCount, d.LikeCount, d.Hashtags,
            Organizer = d.Organizer != null ? new { d.Organizer.Id, d.Organizer.FullName, d.Organizer.Email } : null,
            d.CreatedAt, d.PublishedAt,
            DealOrders = await _db.DealOrders.CountAsync(o => o.DealId == id)
        });
    }

    [HttpPost("deals/{id:guid}/feature")]
    public async Task<IActionResult> FeatureDeal(Guid id, [FromBody] FeatureDealRequest req)
    {
        var deal = await _db.Deals.FindAsync(id);
        if (deal == null) return NotFound();
        // IsFeatured is not yet in the Deal entity — no-op until field is added
        _logger.LogInformation("Admin {AdminId} feature-deal {DealId} (not yet implemented)", AdminId, id);
        return Ok(new { success = true, message = "IsFeatured field not yet available on Deal entity" });
    }

    [HttpPost("deals/bulk-moderate")]
    public async Task<IActionResult> BulkModerateDeals([FromBody] BulkModerateRequest req)
    {
        var succeeded = 0;
        var errors = new List<string>();

        foreach (var idStr in req.Ids)
        {
            if (!Guid.TryParse(idStr, out var dealId))
            { errors.Add($"Invalid ID: {idStr}"); continue; }

            var deal = await _db.Deals.FindAsync(dealId);
            if (deal == null)
            { errors.Add($"Not found: {idStr}"); continue; }

            switch (req.Action.ToLower())
            {
                case "approve":
                    deal.ModerationStatus = ModerationStatus.Approved;
                    deal.ModerationRejectReason = null;
                    deal.Status = DealStatus.Active;
                    break;
                case "reject":
                    deal.ModerationStatus = ModerationStatus.Rejected;
                    deal.ModerationRejectReason = req.Reason ?? "Bulk rejection";
                    deal.Status = DealStatus.Cancelled;
                    break;
                default:
                    errors.Add($"Unknown action '{req.Action}' for {idStr}");
                    continue;
            }
            succeeded++;
        }

        await _db.SaveChangesAsync();
        _logger.LogInformation("Admin {AdminId} bulk moderation: {Action} on {Count} deals", AdminId, req.Action, succeeded);
        return Ok(new { succeeded, failed = errors.Count, errors });
    }

    // ═══════════════════════════════════════════════════════════════
    // DASHBOARD
    // ═══════════════════════════════════════════════════════════════

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var today = DateTime.UtcNow.Date;
        var weekAgo = today.AddDays(-7);

        var totalUsers = await _db.Users.CountAsync();
        var activeDeals = await _db.Deals.CountAsync(d => d.ModerationStatus == ModerationStatus.Approved);
        var ordersToday = await _db.DealOrders.CountAsync(o => o.CreatedAt >= today);
        var newUsersToday = await _db.Users.CountAsync(u => u.CreatedAt >= today);
        var pendingModeration = await _db.Deals.CountAsync(d =>
            d.ModerationStatus == ModerationStatus.Pending ||
            d.ModerationStatus == ModerationStatus.UnderReview);
        var todayRevenue = await _db.DealOrders.Where(o => o.CreatedAt >= today).SumAsync(o => o.TotalPrice);
        var weekAgoUsers = await _db.Users.CountAsync(u => u.CreatedAt < weekAgo);
        var growthPercent = weekAgoUsers > 0
            ? Math.Round((decimal)(totalUsers - weekAgoUsers) / weekAgoUsers * 100, 1)
            : 0;

        var userStats = await _db.Users
            .Where(u => u.CreatedAt >= weekAgo)
            .GroupBy(u => u.CreatedAt.Date)
            .Select(g => new { Date = g.Key.ToString("yyyy-MM-dd"), Count = g.Count() })
            .ToListAsync();

        var dealStats = await _db.Deals
            .Where(d => d.CreatedAt >= weekAgo)
            .GroupBy(d => d.CreatedAt.Date)
            .Select(g => new { Date = g.Key.ToString("yyyy-MM-dd"), Count = g.Count() })
            .ToListAsync();

        return Ok(new
        {
            totalUsers, activeDeals, ordersToday, todayRevenue,
            pendingModeration, newUsersToday, growthPercent,
            userStats, dealStats
        });
    }

    [HttpGet("deals/stats")]
    public async Task<IActionResult> GetDealStats([FromQuery] int days = 30)
    {
        var since = DateTime.UtcNow.AddDays(-days);
        var totalDeals = await _db.Deals.CountAsync();
        var approvedDeals = await _db.Deals.CountAsync(d => d.ModerationStatus == ModerationStatus.Approved);
        var pendingDeals = await _db.Deals.CountAsync(d =>
            d.ModerationStatus == ModerationStatus.Pending ||
            d.ModerationStatus == ModerationStatus.UnderReview);
        var totalOrders = await _db.DealOrders.CountAsync();
        var totalRevenue = await _db.DealOrders.SumAsync(o => o.TotalPrice);

        var categories = await _db.Deals
            .Where(d => d.ModerationStatus == ModerationStatus.Approved)
            .GroupBy(d => d.Category)
            .Select(g => new { category = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count).Take(10)
            .ToListAsync();

        var dailyDeals = await _db.Deals
            .Where(d => d.CreatedAt >= since)
            .GroupBy(d => d.CreatedAt.Date.ToString("yyyy-MM-dd"))
            .Select(g => new { date = g.Key, count = g.Count() })
            .OrderBy(x => x.date).ToListAsync();

        return Ok(new
        {
            totalDeals, approvedDeals, pendingDeals,
            totalOrders, totalRevenue, categories, dailyDeals
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // ORDERS
    // ═══════════════════════════════════════════════════════════════

    [HttpGet("orders")]
    public async Task<IActionResult> GetOrders(
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var q = _db.DealOrders.Include(o => o.Deal).AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            q = q.Where(o => o.Status.ToString() == status);
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(o => o.Deal != null && EF.Functions.ILike(o.Deal.Title, $"%{search}%"));

        var total = await q.CountAsync();
        var orders = await q.OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(o => (object)new
            {
                o.Id,
                BuyerId = o.BuyerId,
                DealTitle = o.Deal != null ? o.Deal.Title : "",
                Status = o.Status.ToString(),
                o.TotalPrice, o.Quantity, o.CreatedAt
            })
            .ToListAsync();

        return Ok(new PagedResult<object>(orders, total, page, pageSize, (int)Math.Ceiling(total / (double)pageSize)));
    }

    [HttpGet("orders/{id:guid}")]
    public async Task<IActionResult> GetOrderDetail(Guid id)
    {
        var o = await _db.DealOrders.Include(x => x.Deal).AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (o == null) return NotFound();
        return Ok(new
        {
            o.Id,
            BuyerId = o.BuyerId,
            DealTitle = o.Deal?.Title ?? "",
            Status = o.Status.ToString(),
            o.TotalPrice, o.Quantity, o.CreatedAt
        });
    }

    [HttpPatch("orders/{id:guid}/status")]
    public async Task<IActionResult> UpdateOrderStatus(Guid id, [FromBody] UpdateOrderStatusRequest req)
    {
        var order = await _db.DealOrders.FindAsync(id);
        if (order == null) return NotFound();
        order.Status = Enum.TryParse<OrderStatus>(req.Status, true, out var os) ? os : order.Status;
        await _db.SaveChangesAsync();
        _logger.LogInformation("Admin {AdminId} updated order {OrderId} status to {Status}", AdminId, id, req.Status);
        return Ok(new { success = true });
    }

    // ═══════════════════════════════════════════════════════════════
    // COMMENTS
    // ═══════════════════════════════════════════════════════════════

    [HttpGet("comments")]
    public async Task<IActionResult> GetComments(
        [FromQuery] Guid? dealId = null,
        [FromQuery] Guid? userId = null,
        [FromQuery] string? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int size = 20)
    {
        var q = _db.DealComments.Include(c => c.User).Include(c => c.Deal).AsNoTracking().AsQueryable();

        if (dealId.HasValue) q = q.Where(c => c.DealId == dealId.Value);
        if (userId.HasValue) q = q.Where(c => c.UserId == userId.Value);
        if (!string.IsNullOrEmpty(status)) q = q.Where(c => c.ModerationStatus == status);

        var total = await q.CountAsync();
        var items = await q.OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * size).Take(size)
            .Select(c => (object)new
            {
                c.Id, c.DealId,
                DealTitle = c.Deal != null ? c.Deal.Title : "",
                c.UserId,
                UserFullName = c.User != null ? c.User.FullName : "",
                UserAvatar = c.User != null ? c.User.AvatarUrl : "",
                c.Content, c.CreatedAt, c.IsHidden, Status = c.ModerationStatus
            })
            .ToListAsync();

        return Ok(new PagedResult<object>(items, total, page, size, (int)Math.Ceiling(total / (double)size)));
    }

    [HttpGet("comments/stats")]
    public async Task<IActionResult> GetCommentStats()
    {
        var total = await _db.DealComments.CountAsync();
        var pending = await _db.DealComments.CountAsync(c => c.ModerationStatus == "PendingReview");
        var approved = await _db.DealComments.CountAsync(c => c.ModerationStatus == "Approved");
        var rejected = await _db.DealComments.CountAsync(c => c.ModerationStatus == "Rejected");
        return Ok(new { total, pendingReview = pending, approved, rejected });
    }

    [HttpPatch("comments/{id:guid}/hide")]
    public async Task<IActionResult> HideComment(Guid id)
    {
        var comment = await _db.DealComments.FindAsync(id);
        if (comment == null) return NotFound();
        comment.IsHidden = true;
        comment.ModerationStatus = "PendingReview";
        await _db.SaveChangesAsync();
        _logger.LogInformation("Admin {AdminId} hid comment {CommentId}", AdminId, id);
        return Ok(new { success = true });
    }

    [HttpPatch("comments/{id:guid}/approve")]
    public async Task<IActionResult> ApproveComment(Guid id)
    {
        var comment = await _db.DealComments.FindAsync(id);
        if (comment == null) return NotFound();
        comment.IsHidden = false;
        comment.ModerationStatus = "Approved";
        await _db.SaveChangesAsync();
        _logger.LogInformation("Admin {AdminId} approved comment {CommentId}", AdminId, id);
        return Ok(new { success = true });
    }

    [HttpDelete("comments/{id:guid}")]
    public async Task<IActionResult> DeleteComment(Guid id)
    {
        var comment = await _db.DealComments.FindAsync(id);
        if (comment == null) return NotFound();
        _db.DealComments.Remove(comment);
        await _db.SaveChangesAsync();
        _logger.LogInformation("Admin {AdminId} deleted comment {CommentId}", AdminId, id);
        return Ok(new { success = true });
    }

    // ═══════════════════════════════════════════════════════════════
    // SAVED LISTS
    // ═══════════════════════════════════════════════════════════════

    [HttpGet("saved-lists")]
    public async Task<IActionResult> GetSavedLists(
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var q = _db.SavedLists.Include(sl => sl.User).AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(sl =>
                EF.Functions.ILike(sl.Name, $"%{search}%") ||
                (sl.User != null && EF.Functions.ILike(sl.User.Email, $"%{search}%")));

        var total = await q.CountAsync();
        var lists = await q.OrderByDescending(sl => sl.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync();

        var items = new List<object>();
        foreach (var sl in lists)
        {
            var dealCount = await _db.SavedDeals.CountAsync(sd => sd.ListId == sl.Id);
            items.Add(new
            {
                sl.Id, sl.UserId,
                UserEmail = sl.User != null ? sl.User.Email : "",
                UserName = sl.User != null ? sl.User.FullName : "",
                sl.Name, sl.IsPublic, dealCount, sl.CreatedAt
            });
        }

        return Ok(new PagedResult<object>(items, total, page, pageSize, (int)Math.Ceiling(total / (double)pageSize)));
    }

    [HttpGet("saved-lists/{id:guid}")]
    public async Task<IActionResult> GetSavedListDetail(Guid id)
    {
        var sl = await _db.SavedLists
            .Include(x => x.User)
            .Include(x => x.SavedDeals).ThenInclude(sd => sd.Deal)
            .AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (sl == null) return NotFound();

        var deals = sl.SavedDeals.Select(sd => new
        {
            sd.Id, sd.DealId,
            DealTitle = sd.Deal != null ? sd.Deal.Title : "",
            DealCategory = sd.Deal != null ? sd.Deal.Category : "",
            DealPrice = sd.Deal != null ? sd.Deal.GroupPrice : 0,
            DealStatus = sd.Deal != null ? sd.Deal.ModerationStatus.ToString() : "",
            sd.SavedAt
        }).ToList();

        return Ok(new
        {
            sl.Id, sl.UserId,
            UserEmail = sl.User != null ? sl.User.Email : "",
            UserName = sl.User != null ? sl.User.FullName : "",
            sl.Name, sl.IsPublic, sl.CreatedAt, Deals = deals
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════════

    [HttpGet("notifications")]
    public async Task<IActionResult> GetNotifications(
        [FromQuery] string? type = null,
        [FromQuery] bool? isRead = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var q = _db.UserNotifications.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(type)) q = q.Where(n => n.Type == type);
        if (isRead.HasValue) q = q.Where(n => n.IsRead == isRead.Value);

        var total = await q.CountAsync();
        var notifs = await q.OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(n => (object)new
            {
                n.Id, n.UserId, n.Type, n.Title, n.Body,
                n.IsRead, n.CreatedAt
            })
            .ToListAsync();

        return Ok(new PagedResult<object>(notifs, total, page, pageSize, (int)Math.Ceiling(total / (double)pageSize)));
    }

    [HttpGet("notifications/stats")]
    public async Task<IActionResult> GetNotificationStats()
    {
        var total = await _db.UserNotifications.CountAsync();
        var unread = await _db.UserNotifications.CountAsync(n => !n.IsRead);
        return Ok(new { total, unread, read = total - unread });
    }

    // ═══════════════════════════════════════════════════════════════
    // CONVERSATIONS / CHAT
    // ═══════════════════════════════════════════════════════════════

    [HttpGet("conversations")]
    public async Task<IActionResult> GetConversations(
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var q = _db.Conversations
            .Include(c => c.Participants).ThenInclude(p => p.User)
            .AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(c => c.Participants.Any(p =>
                p.User != null && (EF.Functions.ILike(p.User.Email, $"%{search}%") ||
                                   EF.Functions.ILike(p.User.FullName, $"%{search}%"))));

        var total = await q.CountAsync();
        var convos = await q.OrderByDescending(c => c.LastMessageAt ?? c.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync();

        var items = new List<object>();
        foreach (var c in convos)
        {
            var msgCount = await _db.ChatMessages.CountAsync(m => m.ConversationId == c.Id);
            var lastMsg = await _db.ChatMessages
                .Where(m => m.ConversationId == c.Id)
                .OrderByDescending(m => m.CreatedAt).FirstOrDefaultAsync();
            items.Add(new
            {
                c.Id, c.DealId,
                Participants = c.Participants.Select(p => new
                {
                    p.UserId,
                    UserName = p.User != null ? p.User.FullName : "",
                    UserAvatar = p.User != null ? p.User.AvatarUrl : ""
                }),
                messageCount = msgCount,
                lastMessage = lastMsg != null ? lastMsg.Content : "",
                c.LastMessageAt, c.CreatedAt
            });
        }

        return Ok(new PagedResult<object>(items, total, page, pageSize, (int)Math.Ceiling(total / (double)pageSize)));
    }

    [HttpGet("conversations/{conversationId}/messages")]
    public async Task<IActionResult> GetChatMessages(
        Guid conversationId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var messages = await _db.ChatMessages
            .Where(m => m.ConversationId == conversationId)
            .OrderByDescending(m => m.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .AsNoTracking()
            .Select(m => new { m.Id, m.SenderId, m.Content, m.IsRead, m.CreatedAt })
            .ToListAsync();

        return Ok(messages);
    }

    // ═══════════════════════════════════════════════════════════════
    // PUSH TOKENS
    // ═══════════════════════════════════════════════════════════════

    [HttpGet("push-tokens")]
    public async Task<IActionResult> GetPushTokens(
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var q = _db.PushTokens.AsNoTracking().AsQueryable();

        var total = await q.CountAsync();
        var tokens = await q.OrderByDescending(pt => pt.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(pt => (object)new
            {
                pt.Id, pt.UserId,
                TokenMasked = pt.Token.Length > 4 ? pt.Token.Substring(0, 4) + "..." + pt.Token.Substring(pt.Token.Length - 4) : "****",
                pt.Platform, pt.IsActive, pt.CreatedAt, pt.LastUsedAt
            })
            .ToListAsync();

        return Ok(new PagedResult<object>(tokens, total, page, pageSize, (int)Math.Ceiling(total / (double)pageSize)));
    }

    // ═══════════════════════════════════════════════════════════════
    // CONTRIBUTOR APPLICATIONS
    // ═══════════════════════════════════════════════════════════════

    [HttpGet("contributor-applications")]
    public async Task<IActionResult> GetContributorApplications(
        [FromQuery] string? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int size = 20)
    {
        var q = _db.ContributorApplications
            .Include(a => a.User).AsNoTracking().AsQueryable();

        if (!string.IsNullOrEmpty(status))
            q = q.Where(a => a.Status == status);

        var total = await q.CountAsync();
        var items = await q.OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * size).Take(size)
            .Select(a => (object)new
            {
                a.Id, a.UserId,
                FullName = a.User != null ? a.User.FullName : "",
                Email = a.User != null ? a.User.Email : "",
                Phone = a.User != null ? a.User.Phone : null,
                a.MobileNo, a.IcPassportNo, a.Nationality,
                a.Race, a.ResidentStatus, a.Status,
                a.RejectionReason, a.CreatedAt, a.ApprovedAt
            })
            .ToListAsync();

        return Ok(new PagedResult<object>(items, total, page, size, (int)Math.Ceiling(total / (double)size)));
    }

    [HttpGet("contributor-applications/{id:guid}")]
    public async Task<IActionResult> GetContributorApplication(Guid id)
    {
        var a = await _db.ContributorApplications
            .Include(x => x.User).AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (a == null) return NotFound();
        return Ok(a);
    }

    [HttpPost("contributor-applications/{id:guid}/review")]
    public async Task<IActionResult> ReviewContributorApplication(Guid id, [FromBody] ReviewContributorAppRequest req)
    {
        var a = await _db.ContributorApplications.FindAsync(id);
        if (a == null) return NotFound();

        if (a.Status != "Pending" && a.Status != "UnderReview")
            return BadRequest(new { success = false, message = $"Cannot review application with status '{a.Status}'" });

        a.Status = req.Action;
        a.ReviewedBy = AdminId;
        a.ReviewedAt = DateTime.UtcNow;

        if (req.Action == "Approved")
        {
            a.ApprovedAt = DateTime.UtcNow;
            var user = await _db.Users.FindAsync(a.UserId);
            if (user != null)
            {
                user.IsContributor = true;
                user.ContributorSince = DateTime.UtcNow;
            }
        }
        else if (req.Action == "Rejected")
        {
            a.RejectionReason = req.Reason;
        }

        await _db.SaveChangesAsync();
        _logger.LogInformation("Admin {AdminId} {Action} contributor application {AppId}", AdminId, req.Action, id);
        return Ok(new { success = true, message = $"Application {req.Action.ToLower()}", data = new { status = a.Status } });
    }

    // ═══════════════════════════════════════════════════════════════
    // FOLLOWS
    // ═══════════════════════════════════════════════════════════════

    [HttpGet("users/{userId:guid}/follow-stats")]
    public async Task<IActionResult> GetFollowStats(Guid userId)
    {
        var followers = await _db.UserFollows.CountAsync(f => f.FollowingId == userId);
        var following = await _db.UserFollows.CountAsync(f => f.FollowerId == userId);
        return Ok(new { followers, following });
    }

    [HttpGet("users/{userId:guid}/followers")]
    public async Task<IActionResult> GetFollowers(Guid userId, [FromQuery] int page = 1, [FromQuery] int size = 20)
    {
        var q = _db.UserFollows.Where(f => f.FollowingId == userId)
            .Include(f => f.Follower).AsNoTracking();
        var total = await q.CountAsync();
        var items = await q.OrderByDescending(f => f.CreatedAt)
            .Skip((page - 1) * size).Take(size)
            .Select(f => (object)new
            {
                f.FollowerId,
                UserName = f.Follower != null ? f.Follower.FullName : "",
                UserAvatar = f.Follower != null ? f.Follower.AvatarUrl : "",
                f.CreatedAt
            })
            .ToListAsync();
        return Ok(new PagedResult<object>(items, total, page, size, (int)Math.Ceiling(total / (double)size)));
    }

    [HttpGet("users/{userId:guid}/following")]
    public async Task<IActionResult> GetFollowing(Guid userId, [FromQuery] int page = 1, [FromQuery] int size = 20)
    {
        var q = _db.UserFollows.Where(f => f.FollowerId == userId)
            .Include(f => f.Following).AsNoTracking();
        var total = await q.CountAsync();
        var items = await q.OrderByDescending(f => f.CreatedAt)
            .Skip((page - 1) * size).Take(size)
            .Select(f => (object)new
            {
                f.FollowingId,
                UserName = f.Following != null ? f.Following.FullName : "",
                UserAvatar = f.Following != null ? f.Following.AvatarUrl : "",
                f.CreatedAt
            })
            .ToListAsync();
        return Ok(new PagedResult<object>(items, total, page, size, (int)Math.Ceiling(total / (double)size)));
    }
}

// ═══════════════════════════════════════════════════════════════
// Request DTOs
// ═══════════════════════════════════════════════════════════════

public record ToggleStatusRequest(bool IsActive);
public record VerifyUserRequest(bool Verify);
public record FeatureDealRequest(bool Featured);
public record BulkModerateRequest(List<string> Ids, string Action, string? Reason = null);
public record UpdateOrderStatusRequest(string Status);
public record ReviewContributorAppRequest(string Action, string? Reason);
