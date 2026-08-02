using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitaTolongKita.Infrastructure.Services;

namespace KitaTolongKita.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class FollowController : ControllerBase
{
    private readonly IFollowService _follow;
    private readonly IPushNotificationService _push;
    private readonly ILogger<FollowController> _logger;

    public FollowController(IFollowService follow, IPushNotificationService push, ILogger<FollowController> logger)
    {
        _follow = follow;
        _push = push;
        _logger = logger;
    }

    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>Follow a user.</summary>
    [HttpPost("{userId}/follow")]
    public async Task<IActionResult> Follow(Guid userId)
    {
        if (userId == CurrentUserId) return BadRequest(new { success = false, message = "Cannot follow yourself" });
        var ok = await _follow.FollowAsync(CurrentUserId, userId);
        if (!ok) return Conflict(new { success = false, message = "Already following" });

        // Send follow notification (fire-and-forget)
        _ = SendFollowNotificationAsync(userId, CurrentUserId);

        return Ok(new { success = true, message = "Followed successfully" });
    }

    /// <summary>Unfollow a user.</summary>
    [HttpDelete("{userId}/follow")]
    public async Task<IActionResult> Unfollow(Guid userId)
    {
        var ok = await _follow.UnfollowAsync(CurrentUserId, userId);
        if (!ok) return NotFound(new { success = false, message = "Not following" });
        return Ok(new { success = true, message = "Unfollowed successfully" });
    }

    /// <summary>Check if current user is following a target user.</summary>
    [HttpGet("{userId}/follow-status")]
    public async Task<IActionResult> GetFollowStatus(Guid userId)
    {
        var isFollowing = await _follow.IsFollowingAsync(CurrentUserId, userId);
        var counts = await _follow.GetCountsAsync(userId);
        return Ok(new
        {
            isFollowing,
            followerCount = counts.followers,
            followingCount = counts.following
        });
    }

    /// <summary>List followers of a user.</summary>
    [HttpGet("{userId}/followers")]
    public async Task<IActionResult> GetFollowers(Guid userId, [FromQuery] int page = 1, [FromQuery] int size = 20)
    {
        var followers = await _follow.GetFollowersAsync(userId, page, size);
        var counts = await _follow.GetCountsAsync(userId);
        return Ok(new { followers, totalFollowers = counts.followers, totalFollowing = counts.following });
    }

    /// <summary>List users this person is following.</summary>
    [HttpGet("{userId}/following")]
    public async Task<IActionResult> GetFollowing(Guid userId, [FromQuery] int page = 1, [FromQuery] int size = 20)
    {
        var following = await _follow.GetFollowingAsync(userId, page, size);
        var counts = await _follow.GetCountsAsync(userId);
        return Ok(new { following, totalFollowers = counts.followers, totalFollowing = counts.following });
    }

    private async Task SendFollowNotificationAsync(Guid targetUserId, Guid followerId)
    {
        try
        {
            // Get follower's name for the notification
            using var scope = _logger.BeginScope("{FollowerId}", followerId);
            await _push.SendAndStoreAsync(targetUserId, "follow",
                "New Follower",
                "Someone started following you",
                new { type = "follow", followerId });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send follow notification to user {UserId}", targetUserId);
        }
    }
}
