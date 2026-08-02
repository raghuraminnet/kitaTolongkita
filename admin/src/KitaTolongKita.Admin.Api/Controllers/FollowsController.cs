using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KitaTolongKita.Admin.Api.Data;
using KitaTolongKita.Admin.Api.DTOs;

namespace KitaTolongKita.Admin.Api.Controllers;

[ApiController]
[Route("api/admin/users")]
[Authorize(Policy = "Viewer")]
public class FollowsController : ControllerBase
{
    private readonly MainDbContext _db;
    public FollowsController(MainDbContext db) => _db = db;

    /// <summary>Get follower count and following count for a user.</summary>
    [HttpGet("{userId}/follow-stats")]
    public async Task<IActionResult> GetFollowStats(Guid userId)
    {
        var followerCount = await _db.UserFollows.CountAsync(f => f.FollowingId == userId);
        var followingCount = await _db.UserFollows.CountAsync(f => f.FollowerId == userId);
        return Ok(new FollowStats(followerCount, followingCount));
    }

    /// <summary>List followers of a user.</summary>
    [HttpGet("{userId}/followers")]
    public async Task<IActionResult> GetFollowers(Guid userId, [FromQuery] int page = 1, [FromQuery] int size = 20)
    {
        var q = _db.UserFollows
            .AsNoTracking()
            .Where(f => f.FollowingId == userId)
            .Include(f => f.Follower);

        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(f => f.CreatedAt)
            .Skip((page - 1) * size).Take(size)
            .Select(f => new FollowerItem(
                f.FollowerId, f.Follower!.FullName, f.Follower.AvatarUrl, f.CreatedAt))
            .ToListAsync();

        return Ok(new PagedResult<FollowerItem>(items, total, page, size,
            (int)Math.Ceiling(total / (double)size)));
    }

    /// <summary>List users that a user is following.</summary>
    [HttpGet("{userId}/following")]
    public async Task<IActionResult> GetFollowing(Guid userId, [FromQuery] int page = 1, [FromQuery] int size = 20)
    {
        var q = _db.UserFollows
            .AsNoTracking()
            .Where(f => f.FollowerId == userId)
            .Include(f => f.Following);

        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(f => f.CreatedAt)
            .Skip((page - 1) * size).Take(size)
            .Select(f => new FollowerItem(
                f.FollowingId, f.Following!.FullName, f.Following.AvatarUrl, f.CreatedAt))
            .ToListAsync();

        return Ok(new PagedResult<FollowerItem>(items, total, page, size,
            (int)Math.Ceiling(total / (double)size)));
    }
}
