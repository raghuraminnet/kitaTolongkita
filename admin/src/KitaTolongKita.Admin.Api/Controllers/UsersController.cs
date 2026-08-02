using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitaTolongKita.Admin.Api.DTOs;
using KitaTolongKita.Admin.Api.Services;

namespace KitaTolongKita.Admin.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "Viewer")]
public class UsersController : ControllerBase
{
    private readonly IAdminService _svc;

    public UsersController(IAdminService svc) => _svc = svc;

    [HttpGet]
    public async Task<IActionResult> GetUsers(
        [FromQuery] string? search = null,
        [FromQuery] string? filter = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _svc.GetUsersAsync(search, filter, page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetUser(string id)
    {
        var user = await _svc.GetUserDetailAsync(id);
        if (user == null) return NotFound(new ApiResponse(false, "User not found"));
        return Ok(new ApiResponse(true, null, user));
    }

    [Authorize(Policy = "Moderator")]
    [HttpPatch("{id}/status")]
    public async Task<IActionResult> ToggleStatus(string id, [FromBody] dynamic body)
    {
        var adminId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        bool isActive = body.isActive;
        var ok = await _svc.ToggleUserStatusAsync(id, isActive, adminId);
        if (!ok) return BadRequest(new ApiResponse(false, "Failed to update user status"));
        return Ok(new ApiResponse(true, isActive ? "User enabled" : "User disabled"));
    }

    [HttpGet("{id}/activity")]
    public async Task<IActionResult> GetUserActivity(string id)
    {
        var result = await _svc.GetUserActivityAsync(id);
        if (result == null) return NotFound(new ApiResponse(false, "User not found"));
        return Ok(new ApiResponse(true, null, result));
    }
}
