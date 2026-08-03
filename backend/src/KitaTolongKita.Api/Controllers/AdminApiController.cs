using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using KitaTolongKita.Core.DTOs;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Infrastructure.Data;
using KitaTolongKita.Infrastructure.Services;

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

    /// <summary>Search/list users in the platform.</summary>
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
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.FullName,
                u.AvatarUrl,
                u.EmailVerified,
                u.IsVerified,
                u.IsContributor,
                u.CreatedAt,
                u.LastLoginAt,
                DealsPosted = _db.Deals.Count(d => d.OrganizerId == u.Id)
            })
            .ToListAsync();

        return Ok(new PagedResult<object>(users, total, page, pageSize, (int)Math.Ceiling(total / (double)pageSize)));
    }

    /// <summary>Get one user's full detail with their deals and orders.</summary>
    [HttpGet("users/{id:guid}")]
    public async Task<IActionResult> GetUserDetail(Guid id)
    {
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id);
        if (user == null) return NotFound();

        var deals = await _db.Deals
            .Where(d => d.OrganizerId == id)
            .OrderByDescending(d => d.CreatedAt).Take(20)
            .Select(d => new { d.Id, d.Title, d.ModerationStatus, d.CreatedAt })
            .ToListAsync();

        var orders = await _db.DealOrders
            .Where(o => o.BuyerId == id)
            .OrderByDescending(o => o.CreatedAt).Take(20)
            .Include(o => o.Deal)
            .Select(o => new { o.Id, DealTitle = o.Deal != null ? o.Deal.Title : "", o.Status, o.TotalPrice, o.CreatedAt })
            .ToListAsync();

        return Ok(new
        {
            user.Id,
            user.Email,
            user.FullName,
            user.AvatarUrl,
            user.EmailVerified,
            user.IsVerified,
            user.IsContributor,
            user.Bio,
            user.City,
            user.Website,
            user.CreatedAt,
            user.LastLoginAt,
            user.ContributorSince,
            user.ContributorRating,
            DealsPosted = deals,
            Orders = orders
        });
    }

    /// <summary>Toggle a user's active status.</summary>
    [HttpPatch("users/{id:guid}/toggle-status")]
    public async Task<IActionResult> ToggleUserStatus(Guid id, [FromBody] ToggleStatusRequest req)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();
        user.IsActive = req.IsActive;
        await _db.SaveChangesAsync();
        _logger.LogInformation("Admin {AdminId} toggled user {UserId} active={IsActive}", AdminId, id, req.IsActive);
        return Ok(new { success = true });
    }

    /// <summary>Verify or unverify a user.</summary>
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

    /// <summary>List all deals with optional status/search filters.</summary>
    [HttpGet("deals")]
    public async Task<IActionResult> GetAllDeals(
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var q = _db.Deals.Include(d => d.Organizer).AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && status != "All")
            q = q.Where(d => d.ModerationStatus == status);
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(d => EF.Functions.ILike(d.Title, $"%{search}%") || EF.Functions.ILike(d.Category, $"%{search}%"));

        var total = await q.CountAsync();
        var deals = await q.OrderByDescending(d => d.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(d => new
            {
                d.Id,
                d.Title,
                d.Category,
                OrganizerName = d.Organizer != null ? d.Organizer.FullName : "",
                d.GroupPrice,
                d.MembersJoined,
                d.MinMembers,
                d.ModerationStatus,
                d.IsFeatured,
                d.CreatedAt
            })
            .ToListAsync();

        return Ok(new PagedResult<object>(deals, total, page, pageSize, (int)Math.Ceiling(total / (double)pageSize)));
    }

    /// <summary>Get one deal's full details.</summary>
    [HttpGet("deals/{id:guid}")]
    public async Task<IActionResult> GetDealDetail(Guid id)
    {
        var d = await _db.Deals.Include(x => x.Organizer).AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (d == null) return NotFound();
        return Ok(new
        {
            d.Id,
            d.Title,
            d.Description,
            d.Category,
            d.OriginalPrice,
            d.GroupPrice,
            d.MinMembers,
            d.MaxMembers,
            d.MembersJoined,
            d.Deadline,
            d.PickupLocation,
            d.ImageUrl,
            d.ImageUrls,
            d.Status,
            d.ModerationStatus,
            d.ModerationScore,
            d.ModerationFlags,
            d.ModerationRejectReason,
            d.UpvoteCount,
            d.LikeCount,
            d.IsFeatured,
            d.Hashtags,
            Organizer = d.Organizer != null ? new { d.Organizer.Id, d.Organizer.FullName, d.Organizer.Email } : null,
            d.CreatedAt,
            d.PublishedAt,
            DealOrders = await _db.DealOrders.CountAsync(o => o.DealId == id)
        });
    }

    /// <summary>Feature or unfeature a deal.</summary>
    [HttpPost("deals/{id:guid}/feature")]
    public async Task<IActionResult> FeatureDeal(Guid id, [FromBody] FeatureDealRequest req)
    {
        var deal = await _db.Deals.FindAsync(id);
        if (deal == null) return NotFound();
        deal.IsFeatured = req.Featured;
        await _db.SaveChangesAsync();
        _logger.LogInformation("Admin {AdminId} set deal {DealId} featured={Featured}", AdminId, id, req.Featured);
        return Ok(new { success = true });
    }

    /// <summary>Bulk moderate deals: approve, reject, feature, unfeature.</summary>
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
                case "feature":
                    deal.IsFeatured = true;
                    break;
                case "unfeature":
                    deal.IsFeatured = false;
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

    /// <summary>Dashboard KPIs.</summary>
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
            totalUsers,
            activeDeals,
            ordersToday,
            todayRevenue,
            pendingModeration,
            newUsersToday,
            growthPercent,
            userStats,
            dealStats
        });
    }

    /// <summary>Deal category + revenue stats.</summary>
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
            .OrderByDescending(x => x.count)
            .Take(10)
            .ToListAsync();

        var dailyDeals = await _db.Deals
            .Where(d => d.CreatedAt >= since)
            .GroupBy(d => d.CreatedAt.Date.ToString("yyyy-MM-dd"))
            .Select(g => new { date = g.Key, count = g.Count() })
            .OrderBy(x => x.date)
            .ToListAsync();

        return Ok(new
        {
            totalDeals,
            approvedDeals,
            pendingDeals,
            totalOrders,
            totalRevenue,
            categories,
            dailyDeals
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // ORDERS
    // ═══════════════════════════════════════════════════════════════

    /// <summary>List all deal orders.</summary>
    [HttpGet("orders")]
    public async Task<IActionResult> GetOrders(
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var q = _db.DealOrders.Include(o => o.User).Include(o => o.Deal).AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            q = q.Where(o => o.Status == status);
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(o =>
                (o.User != null && EF.Functions.ILike(o.User.Email, $"%{search}%")) ||
                (o.Deal != null && EF.Functions.ILike(o.Deal.Title, $"%{search}%")));

        var total = await q.CountAsync();
        var orders = await q.OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(o => new
            {
                o.Id,
                BuyerName = o.User != null ? o.User.FullName : "",
                BuyerEmail = o.User != null ? o.User.Email : "",
                DealTitle = o.Deal != null ? o.Deal.Title : "",
                o.Status,
                o.TotalPrice,
                o.Quantity,
                o.CreatedAt
            })
            .ToListAsync();

        return Ok(new PagedResult<object>(orders, total, page, pageSize, (int)Math.Ceiling(total / (double)pageSize)));
    }

    /// <summary>Get one order's detail.</summary>
    [HttpGet("orders/{id:guid}")]
    public async Task<IActionResult> GetOrderDetail(Guid id)
    {
        var o = await _db.DealOrders.Include(x => x.User).Include(x => x.Deal).AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (o == null) return NotFound();
        return Ok(new
        {
            o.Id,
            BuyerName = o.User?.FullName ?? "",
            BuyerEmail = o.User?.Email ?? "",
            BuyerPhone = o.User?.Phone,
            DealTitle = o.Deal?.Title ?? "",
            o.Status,
            o.TotalPrice,
            o.Quantity,
            o.CreatedAt,
            o.UpdatedAt
        });
    }

    /// <summary>Update order status.</summary>
    [HttpPatch("orders/{id:guid}/status")]
    public async Task<IActionResult> UpdateOrderStatus(Guid id, [FromBody] UpdateOrderStatusRequest req)
    {
        var order = await _db.DealOrders.FindAsync(id);
        if (order == null) return NotFound();
        order.Status = req.Status;
        order.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        _logger.LogInformation("Admin {AdminId} updated order {OrderId} status to {Status}", AdminId, id, req.Status);
        return Ok(new { success = true });
    }

    // ═══════════════════════════════════════════════════════════════
    // COMMENTS
    // ═══════════════════════════════════════════════════════════════

    /// <summary>List all comments with filters.</summary>
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
            .Select(c => new
            {
                c.Id,
                c.DealId,
                DealTitle = c.Deal != null ? c.Deal.Title : "",
                c.UserId,
                UserFullName = c.User != null ? c.User.FullName : "",
                UserAvatar = c.User != null ? c.User.AvatarUrl : "",
                c.Content,
                c.CreatedAt,
                c.IsHidden,
                c.ModerationStatus
            })
            .ToListAsync();

        return Ok(new PagedResult<object>(items, total, page, size, (int)Math.Ceiling(total / (double)size)));
    }

    /// <summary>Comment moderation stats.</summary>
    [HttpGet("comments/stats")]
    public async Task<IActionResult> GetCommentStats()
    {
        var total = await _db.DealComments.CountAsync();
        var pending = await _db.DealComments.CountAsync(c => c.ModerationStatus == "PendingReview");
        var approved = await _db.DealComments.CountAsync(c => c.ModerationStatus == "Approved");
        var rejected = await _db.DealComments.CountAsync(c => c.ModerationStatus == "Rejected");
        return Ok(new { total, pendingReview = pending, approved, rejected });
    }

    /// <summary>Hide a comment.</summary>
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

    /// <summary>Approve a hidden/pending comment.</summary>
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

    /// <summary>Delete a comment permanently.</summary>
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

    /// <summary>List all saved lists.</summary>
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
                sl.Id,
                sl.UserId,
                UserEmail = sl.User?.Email ?? "",
                UserName = sl.User?.FullName ?? "",
                sl.Name,
                sl.IsPublic,
                dealCount,
                sl.CreatedAt
            });
        }

        return Ok(new PagedResult<object>(items, total, page, pageSize, (int)Math.Ceiling(total / (double)pageSize)));
    }

    /// <summary>Get one saved list with all its deals.</summary>
    [HttpGet("saved-lists/{id:guid}")]
    public async Task<IActionResult> GetSavedListDetail(Guid id)
    {
        var sl = await _db.SavedLists.Include(x => x.User).Include(x => x.SavedDeals).ThenInclude(sd => sd.Deal)
            .AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (sl == null) return NotFound();

        var deals = sl.SavedDeals.Select(sd => new
        {
            sd.Id,
            sd.DealId,
            DealTitle = sd.Deal?.Title ?? "",
            DealCategory = sd.Deal?.Category ?? "",
            DealPrice = sd.Deal?.GroupPrice ?? 0,
            DealStatus = sd.Deal?.ModerationStatus ?? "",
            sd.SavedAt
        }).ToList();

        return Ok(new
        {
            sl.Id,
            sl.UserId,
            UserEmail = sl.User?.Email ?? "",
            UserName = sl.User?.FullName ?? "",
            sl.Name,
            sl.IsPublic,
            sl.CreatedAt,
            Deals = deals
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════════

    /// <summary>List all user notifications.</summary>
    [HttpGet("notifications")]
    public async Task<IActionResult> GetNotifications(
        [FromQuery] string? type = null,
        [FromQuery] bool? isRead = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var q = _db.UserNotifications.Include(n => n.User).AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(type)) q = q.Where(n => n.Type == type);
        if (isRead.HasValue) q = q.Where(n => n.IsRead == isRead.Value);

        var total = await q.CountAsync();
        var notifs = await q.OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(n => new
            {
                n.Id,
                n.UserId,
                UserEmail = n.User != null ? n.User.Email : "",
                UserName = n.User != null ? n.User.FullName : "",
                n.Type,
                n.Title,
                n.Body,
                n.IsRead,
                n.CreatedAt
            })
            .ToListAsync();

        return Ok(new PagedResult<object>(notifs, total, page, pageSize, (int)Math.Ceiling(total / (double)pageSize)));
    }

    /// <summary>Notification stats.</summary>
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

    /// <summary>List all chat conversations.</summary>
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
                c.Id,
                c.DealId,
                Participants = c.Participants.Select(p => new { p.UserId, UserName = p.User?.FullName ?? "", p.User?.AvatarUrl }),
                messageCount = msgCount,
                lastMessage = lastMsg?.Content,
                c.LastMessageAt,
                c.CreatedAt
            });
        }

        return Ok(new PagedResult<object>(items, total, page, pageSize, (int)Math.Ceiling(total / (double)pageSize)));
    }

    /// <summary>Get messages in a conversation.</summary>
    [HttpGet("conversations/{conversationId}/messages")]
    public async Task<IActionResult> GetChatMessages(
        Guid conversationId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var messages = await _db.ChatMessages
            .Include(m => m.Sender)
            .Where(m => m.ConversationId == conversationId)
            .OrderByDescending(m => m.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .AsNoTracking()
            .Select(m => new
            {
                m.Id,
                m.SenderId,
                SenderName = m.Sender != null ? m.Sender.FullName : "",
                m.Content,
                m.IsRead,
                m.CreatedAt
            })
            .ToListAsync();

        return Ok(messages);
    }

    // ═══════════════════════════════════════════════════════════════
    // PUSH TOKENS
    // ═══════════════════════════════════════════════════════════════

    /// <summary>List all FCM push tokens.</summary>
    [HttpGet("push-tokens")]
    public async Task<IActionResult> GetPushTokens(
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var q = _db.PushTokens.Include(pt => pt.User).AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(pt =>
                (pt.User != null && EF.Functions.ILike(pt.User.Email, $"%{search}%")) ||
                (pt.User != null && EF.Functions.ILike(pt.User.FullName, $"%{search}%")));

        var total = await q.CountAsync();
        var tokens = await q.OrderByDescending(pt => pt.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(pt => new
            {
                pt.Id,
                pt.UserId,
                UserEmail = pt.User != null ? pt.User.Email : "",
                UserName = pt.User != null ? pt.User.FullName : "",
                TokenMasked = pt.Token.Length > 8 ? $"{pt.Token[..4]}...{pt.Token[^4..]}" : "****",
                pt.Platform,
                pt.IsActive,
                pt.CreatedAt,
                pt.LastUsedAt
            })
            .ToListAsync();

        return Ok(new PagedResult<object>(tokens, total, page, pageSize, (int)Math.Ceiling(total / (double)pageSize)));
    }

    // ═══════════════════════════════════════════════════════════════
    // CONTRIBUTOR APPLICATIONS
    // ═══════════════════════════════════════════════════════════════

    /// <summary>List all contributor applications.</summary>
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
            .Select(a => new
            {
                a.Id,
                a.UserId,
                FullName = a.User != null ? a.User.FullName : "",
                Email = a.User != null ? a.User.Email : "",
                Phone = a.User != null ? a.User.Phone : null,
                a.MobileNo,
                a.IcPassportNo,
                a.Nationality,
                a.Race,
                a.ResidentStatus,
                a.Status,
                a.RejectionReason,
                a.CreatedAt,
                a.ApprovedAt
            })
            .ToListAsync();

        return Ok(new PagedResult<object>(items, total, page, size, (int)Math.Ceiling(total / (double)size)));
    }

    /// <summary>Get one contributor application.</summary>
    [HttpGet("contributor-applications/{id:guid}")]
    public async Task<IActionResult> GetContributorApplication(Guid id)
    {
        var a = await _db.ContributorApplications
            .Include(x => x.User).AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (a == null) return NotFound();
        return Ok(a);
    }

    /// <summary>Review (approve/reject) a contributor application.</summary>
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

    /// <summary>Get follower/following counts for a user.</summary>
    [HttpGet("users/{userId:guid}/follow-stats")]
    public async Task<IActionResult> GetFollowStats(Guid userId)
    {
        var followers = await _db.UserFollows.CountAsync(f => f.FollowingId == userId);
        var following = await _db.UserFollows.CountAsync(f => f.FollowerId == userId);
        return Ok(new { followers, following });
    }

    /// <summary>List followers of a user.</summary>
    [HttpGet("users/{userId:guid}/followers")]
    public async Task<IActionResult> GetFollowers(Guid userId, [FromQuery] int page = 1, [FromQuery] int size = 20)
    {
        var q = _db.UserFollows.Where(f => f.FollowingId == userId)
            .Include(f => f.Follower).AsNoTracking();
        var total = await q.CountAsync();
        var items = await q.OrderByDescending(f => f.CreatedAt)
            .Skip((page - 1) * size).Take(size)
            .Select(f => new { f.FollowerId, UserName = f.Follower != null ? f.Follower.FullName : "", f.Follower?.AvatarUrl, f.CreatedAt })
            .ToListAsync();
        return Ok(new PagedResult<object>(items, total, page, size, (int)Math.Ceiling(total / (double)size)));
    }

    /// <summary>List users a user is following.</summary>
    [HttpGet("users/{userId:guid}/following")]
    public async Task<IActionResult> GetFollowing(Guid userId, [FromQuery] int page = 1, [FromQuery] int size = 20)
    {
        var q = _db.UserFollows.Where(f => f.FollowerId == userId)
            .Include(f => f.Following).AsNoTracking();
        var total = await q.CountAsync();
        var items = await q.OrderByDescending(f => f.CreatedAt)
            .Skip((page - 1) * size).Take(size)
            .Select(f => new { f.FollowingId, UserName = f.Following != null ? f.Following.FullName : "", f.Following?.AvatarUrl, f.CreatedAt })
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
