using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitaTolongKita.Admin.Api.DTOs;
using KitaTolongKita.Admin.Api.Services;

namespace KitaTolongKita.Admin.Api.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize(Policy = "Moderator")]
public class NotificationsController : ControllerBase
{
    private readonly IAdminService _svc;

    public NotificationsController(IAdminService svc) => _svc = svc;

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? type,
        [FromQuery] bool? isRead,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _svc.GetNotificationsAsync(type, isRead, page, pageSize);
        return Ok(new ApiResponse(true, null, result));
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var stats = await _svc.GetNotificationStatsAsync();
        return Ok(new ApiResponse(true, null, stats));
    }
}
