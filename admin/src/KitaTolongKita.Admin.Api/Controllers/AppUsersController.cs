using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitaTolongKita.Admin.Api.DTOs;
using KitaTolongKita.Admin.Api.Services;

namespace KitaTolongKita.Admin.Api.Controllers;

[ApiController]
[Route("api/app-users")]
[Authorize(Policy = "Viewer")]
public class AppUsersController : ControllerBase
{
    private readonly IAdminService _svc;
    public AppUsersController(IAdminService svc) => _svc = svc;

    [HttpGet]
    public async Task<IActionResult> GetUsers(
        [FromQuery] string? search = null,
        [FromQuery] string? filter = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _svc.GetUsersAsync(search, filter, page, pageSize);
        return Ok(new { data = result.Items, total = result.TotalCount, count = result.Items.Count });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetUser(Guid id)
    {
        var user = await _svc.GetUserDetailAsync(id.ToString());
        if (user == null) return NotFound(new ApiResponse(false, "User not found"));
        return Ok(new ApiResponse(true, null, user));
    }
}
