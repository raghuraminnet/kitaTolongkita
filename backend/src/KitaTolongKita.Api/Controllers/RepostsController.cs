using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitaTolongKita.Infrastructure.Services;

namespace KitaTolongKita.Api.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class RepostsController : ControllerBase
{
    private readonly IRepostService _reposts;
    private readonly ILogger<RepostsController> _logger;

    public RepostsController(IRepostService reposts, ILogger<RepostsController> logger)
    {
        _reposts = reposts;
        _logger = logger;
    }

    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>Repost a deal to your profile.</summary>
    [HttpPost("deals/{dealId}/repost")]
    public async Task<IActionResult> Repost(Guid dealId)
    {
        var ok = await _reposts.RepostAsync(dealId, CurrentUserId);
        if (!ok) return Conflict(new { success = false, message = "Already reposted or deal not found" });
        return Ok(new { success = true, message = "Reposted successfully" });
    }

    /// <summary>Remove repost of a deal from your profile.</summary>
    [HttpDelete("deals/{dealId}/repost")]
    public async Task<IActionResult> Unrepost(Guid dealId)
    {
        var ok = await _reposts.UnrepostAsync(dealId, CurrentUserId);
        if (!ok) return NotFound(new { success = false, message = "Repost not found" });
        return Ok(new { success = true, message = "Repost removed" });
    }

    /// <summary>Check if current user has reposted a deal.</summary>
    [HttpGet("deals/{dealId}/repost-status")]
    public async Task<IActionResult> GetRepostStatus(Guid dealId)
    {
        var hasReposted = await _reposts.HasRepostedAsync(dealId, CurrentUserId);
        var count = await _reposts.GetRepostCountAsync(dealId);
        return Ok(new { hasReposted, repostCount = count });
    }

    /// <summary>Get repost count for a deal.</summary>
    [HttpGet("deals/{dealId}/repost-count")]
    public async Task<IActionResult> GetRepostCount(Guid dealId)
    {
        var count = await _reposts.GetRepostCountAsync(dealId);
        return Ok(new { dealId, count });
    }

    /// <summary>Get current user's reposts (for profile Reposts tab).</summary>
    [HttpGet("users/me/reposts")]
    public async Task<IActionResult> GetMyReposts([FromQuery] int page = 1, [FromQuery] int size = 20)
    {
        if (size > 50) size = 50;
        var reposts = await _reposts.GetUserRepostsAsync(CurrentUserId, page, size);
        return Ok(new { reposts, page, size });
    }

    /// <summary>Get a specific user's reposts (public profile).</summary>
    [HttpGet("users/{userId}/reposts")]
    public async Task<IActionResult> GetUserReposts(Guid userId, [FromQuery] int page = 1, [FromQuery] int size = 20)
    {
        if (size > 50) size = 50;
        var reposts = await _reposts.GetUserRepostsAsync(userId, page, size);
        return Ok(new { reposts, page, size });
    }
}
