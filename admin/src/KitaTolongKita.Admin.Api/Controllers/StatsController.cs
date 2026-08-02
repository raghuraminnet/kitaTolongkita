using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitaTolongKita.Admin.Api.DTOs;
using KitaTolongKita.Admin.Api.Services;

namespace KitaTolongKita.Admin.Api.Controllers;

[ApiController]
[Route("api/stats")]
[Authorize(Policy = "Moderator")]
public class StatsController : ControllerBase
{
    private readonly IAdminService _svc;

    public StatsController(IAdminService svc) => _svc = svc;

    [HttpGet("deals")]
    public async Task<IActionResult> GetDealStats([FromQuery] int days = 30)
    {
        var result = await _svc.GetDealStatsAsync(days);
        return Ok(new ApiResponse(true, null, result));
    }
}
