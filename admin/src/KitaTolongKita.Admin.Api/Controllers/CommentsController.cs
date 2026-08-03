using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitaTolongKita.Admin.Api.Services;

namespace KitaTolongKita.Admin.Api.Controllers;

[ApiController]
[Route("api/admin/comments")]
[Authorize(Policy = "Moderator")]
public class CommentsController : ControllerBase
{
    private readonly IAdminService _svc;
    public CommentsController(IAdminService svc) => _svc = svc;

    [HttpGet]
    public async Task<IActionResult> GetComments(
        [FromQuery] Guid? dealId = null,
        [FromQuery] Guid? userId = null,
        [FromQuery] string? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int size = 20)
    {
        var result = await _svc.GetCommentsAsync(dealId, userId, status, page, size);
        return Ok(result);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var stats = await _svc.GetCommentStatsAsync();
        return Ok(stats);
    }

    [HttpPatch("{id:guid}/hide")]
    public async Task<IActionResult> HideComment(Guid id)
    {
        var ok = await _svc.HideCommentAsync(id);
        if (!ok) return NotFound();
        return Ok(new { success = true, message = "Comment hidden" });
    }

    [HttpPatch("{id:guid}/approve")]
    public async Task<IActionResult> ApproveComment(Guid id)
    {
        var ok = await _svc.ApproveCommentAsync(id);
        if (!ok) return NotFound();
        return Ok(new { success = true, message = "Comment approved" });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteComment(Guid id)
    {
        var ok = await _svc.DeleteCommentAsync(id);
        if (!ok) return NotFound();
        return Ok(new { success = true, message = "Comment deleted" });
    }
}
