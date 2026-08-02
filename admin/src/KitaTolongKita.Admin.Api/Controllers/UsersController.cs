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

    /// <summary>Verify or revoke verification badge for a user.</summary>
    [Authorize(Policy = "Moderator")]
    [HttpPatch("{id}/verify")]
    public async Task<IActionResult> VerifyUser(string id, [FromBody] VerifyUserRequest req)
    {
        var adminId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var ok = await _svc.VerifyUserAsync(id, req.Verify, adminId);
        if (!ok) return BadRequest(new ApiResponse(false, "Failed to update verification status"));
        return Ok(new ApiResponse(true, req.Verify ? "User verified" : "Verification revoked"));
    }

    [HttpGet("{id}/activity")]
    public async Task<IActionResult> GetUserActivity(string id)
    {
        var result = await _svc.GetUserActivityAsync(id);
        if (result == null) return NotFound(new ApiResponse(false, "User not found"));
        return Ok(new ApiResponse(true, null, result));
    }
}

public record VerifyUserRequest(bool Verify);
