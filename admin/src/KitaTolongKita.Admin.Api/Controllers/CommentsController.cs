using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KitaTolongKita.Admin.Api.Data;
using KitaTolongKita.Admin.Api.DTOs;

namespace KitaTolongKita.Admin.Api.Controllers;

[ApiController]
[Route("api/admin/comments")]
[Authorize(Policy = "Moderator")]
public class CommentsController : ControllerBase
{
    private readonly MainDbContext _db;
    private readonly ILogger<CommentsController> _logger;

    public CommentsController(MainDbContext db, ILogger<CommentsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>Browse all comments with filters.</summary>
    [HttpGet]
    public async Task<IActionResult> GetComments(
        [FromQuery] Guid? dealId = null,
        [FromQuery] Guid? userId = null,
        [FromQuery] string? status = null,   // PendingReview | Approved | Rejected
        [FromQuery] int page = 1,
        [FromQuery] int size = 20)
    {
        var q = _db.DealComments
            .Include(c => c.User)
            .Include(c => c.Deal)
            .AsNoTracking()
            .AsQueryable();

        if (dealId.HasValue) q = q.Where(c => c.DealId == dealId.Value);
        if (userId.HasValue) q = q.Where(c => c.UserId == userId.Value);
        if (!string.IsNullOrEmpty(status)) q = q.Where(c => c.ModerationStatus == status);

        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * size).Take(size)
            .Select(c => new CommentItem(
                c.Id, c.DealId, c.Deal!.Title,
                c.UserId, c.User!.FullName, c.User.AvatarUrl,
                c.Content, c.CreatedAt,
                c.IsHidden, c.ModerationStatus))
            .ToListAsync();

        return Ok(new PagedResult<CommentItem>(items, total, page, size,
            (int)Math.Ceiling(total / (double)size)));
    }

    /// <summary>Comment moderation stats.</summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var total = await _db.DealComments.CountAsync();
        var pending = await _db.DealComments.CountAsync(c => c.ModerationStatus == "PendingReview");
        var approved = await _db.DealComments.CountAsync(c => c.ModerationStatus == "Approved");
        var rejected = await _db.DealComments.CountAsync(c => c.ModerationStatus == "Rejected");
        return Ok(new CommentStats(total, pending, approved, rejected));
    }

    /// <summary>Hide a comment (admin moderation).</summary>
    [HttpPatch("{id}/hide")]
    public async Task<IActionResult> HideComment(Guid id)
    {
        var comment = await _db.DealComments.FindAsync(id);
        if (comment == null) return NotFound();
        comment.IsHidden = true;
        comment.ModerationStatus = "PendingReview";
        await _db.SaveChangesAsync();
        _logger.LogInformation("Admin hid comment {CommentId}", id);
        return Ok(new { success = true, message = "Comment hidden" });
    }

    /// <summary>Approve a hidden/pending comment.</summary>
    [HttpPatch("{id}/approve")]
    public async Task<IActionResult> ApproveComment(Guid id)
    {
        var comment = await _db.DealComments.FindAsync(id);
        if (comment == null) return NotFound();
        comment.IsHidden = false;
        comment.ModerationStatus = "Approved";
        await _db.SaveChangesAsync();
        _logger.LogInformation("Admin approved comment {CommentId}", id);
        return Ok(new { success = true, message = "Comment approved" });
    }

    /// <summary>Permanently delete a comment.</summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteComment(Guid id)
    {
        var comment = await _db.DealComments.FindAsync(id);
        if (comment == null) return NotFound();
        _db.DealComments.Remove(comment);
        await _db.SaveChangesAsync();
        _logger.LogInformation("Admin deleted comment {CommentId}", id);
        return Ok(new { success = true, message = "Comment deleted" });
    }
}
