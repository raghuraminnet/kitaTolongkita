using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitaTolongKita.Infrastructure.Services;

namespace KitaTolongKita.Api.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class CommentsController : ControllerBase
{
    private readonly ICommentService _comments;
    private readonly ILogger<CommentsController> _logger;
    private const int MaxLength = 500;

    public CommentsController(ICommentService comments, ILogger<CommentsController> logger)
    {
        _comments = comments;
        _logger = logger;
    }

    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>List comments on a deal.</summary>
    [HttpGet("deals/{dealId}/comments")]
    public async Task<IActionResult> GetComments(Guid dealId, [FromQuery] int page = 1, [FromQuery] int size = 20)
    {
        if (size > 50) size = 50;
        var comments = await _comments.GetCommentsAsync(dealId, page, size);
        var total = await _comments.GetCommentCountAsync(dealId);
        return Ok(new { comments, total, page, size });
    }

    /// <summary>Add a comment to a deal. Max 500 characters.</summary>
    [HttpPost("deals/{dealId}/comments")]
    public async Task<IActionResult> CreateComment(Guid dealId, [FromBody] CreateCommentRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Content))
            return BadRequest(new { success = false, message = "Comment cannot be empty" });

        if (req.Content.Length > MaxLength)
            return BadRequest(new { success = false, message = $"Comment exceeds {MaxLength} character limit" });

        var comment = await _comments.CreateCommentAsync(dealId, CurrentUserId, req.Content);
        if (comment == null)
            return NotFound(new { success = false, message = "Deal not found" });

        return Created($"/api/deals/{dealId}/comments/{comment.Id}", new
        {
            success = true,
            comment = new
            {
                comment.Id,
                comment.Content,
                comment.CreatedAt,
                comment.ModerationStatus,
                comment.IsHidden
            }
        });
    }

    /// <summary>Delete own comment (soft delete: content cleared).</summary>
    [HttpDelete("comments/{commentId}")]
    public async Task<IActionResult> DeleteComment(Guid commentId)
    {
        var ok = await _comments.DeleteCommentAsync(commentId, CurrentUserId);
        if (!ok) return NotFound(new { success = false, message = "Comment not found or not yours" });
        return Ok(new { success = true, message = "Comment deleted" });
    }

    /// <summary>Get total comment count for a deal.</summary>
    [HttpGet("deals/{dealId}/comments/count")]
    public async Task<IActionResult> GetCommentCount(Guid dealId)
    {
        var count = await _comments.GetCommentCountAsync(dealId);
        return Ok(new { dealId, count });
    }
}

public record CreateCommentRequest(string Content);
