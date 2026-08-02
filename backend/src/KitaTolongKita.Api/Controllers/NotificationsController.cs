using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Infrastructure.Data;

namespace KitaTolongKita.Api.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _db;

    public NotificationsController(AppDbContext db) => _db = db;

    /// <summary>Get all notifications for the current user.</summary>
    [HttpGet]
    public async Task<IActionResult> GetNotifications(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 30,
        [FromQuery] string? type = null,
        [FromQuery] bool? isRead = null)
    {
        var userId = GetUserId();

        var q = _db.UserNotifications.Where(n => n.UserId == userId);
        if (!string.IsNullOrEmpty(type))
            q = q.Where(n => n.Type == type);
        if (isRead != null)
            q = q.Where(n => n.IsRead == isRead);

        var total = await q.CountAsync();

        // Materialize the query first so we can safely call JsonSerializer.Deserialize
        // (which can't live inside an EF expression tree).
        var rows = await q
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var notifications = rows.Select(n => new
        {
            n.Id,
            n.Type,
            n.Title,
            n.Body,
            n.IsRead,
            n.CreatedAt,
            Data = string.IsNullOrEmpty(n.DataJson)
                ? null
                : JsonSerializer.Deserialize<object>(n.DataJson)
        }).ToList();

        return Ok(new { items = notifications, total, page, pageSize });
    }

    /// <summary>Mark a notification as read.</summary>
    [HttpPatch("{id:guid}/read")]
    public async Task<IActionResult> MarkAsRead(Guid id)
    {
        var userId = GetUserId();
        var notification = await _db.UserNotifications
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

        if (notification == null) return NotFound();

        notification.IsRead = true;
        await _db.SaveChangesAsync();
        return Ok(new { message = "Marked as read" });
    }

    /// <summary>Mark all notifications as read.</summary>
    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var userId = GetUserId();
        var count = await _db.UserNotifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));
        return Ok(new { markedCount = count });
    }

    /// <summary>Get unread notification count.</summary>
    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var userId = GetUserId();
        var count = await _db.UserNotifications
            .CountAsync(n => n.UserId == userId && !n.IsRead);
        return Ok(new { count });
    }

    private Guid GetUserId()
    {
        var idStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(idStr, out var id) ? id : Guid.Empty;
    }
}
