using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitaTolongKita.Admin.Api.Services;

namespace KitaTolongKita.Admin.Api.Controllers;

[ApiController]
[Route("api/admin/users")]
[Authorize(Policy = "Viewer")]
public class FollowsController : ControllerBase
{
    private readonly IAdminService _svc;
    public FollowsController(IAdminService svc) => _svc = svc;

    [HttpGet("{userId:guid}/follow-stats")]
    public async Task<IActionResult> GetFollowStats(Guid userId)
    {
        var stats = await _svc.GetFollowStatsAsync(userId);
        return Ok(stats);
    }

    [HttpGet("{userId:guid}/followers")]
    public async Task<IActionResult> GetFollowers(Guid userId, [FromQuery] int page = 1, [FromQuery] int size = 20)
    {
        var result = await _svc.GetFollowersAsync(userId, page, size);
        return Ok(result);
    }

    [HttpGet("{userId:guid}/following")]
    public async Task<IActionResult> GetFollowing(Guid userId, [FromQuery] int page = 1, [FromQuery] int size = 20)
    {
        var result = await _svc.GetFollowingAsync(userId, page, size);
        return Ok(result);
    }
}
