using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitaTolongKita.Admin.Api.DTOs;
using KitaTolongKita.Admin.Api.Services;

namespace KitaTolongKita.Admin.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "SuperAdmin")]
public class SettingsController : ControllerBase
{
    private readonly IAdminService _svc;

    public SettingsController(IAdminService svc) => _svc = svc;

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var settings = await _svc.GetSettingsAsync();
        return Ok(new ApiResponse(true, null, settings));
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] UpdateSettingRequest req)
    {
        var adminId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var ok = await _svc.UpdateSettingAsync(req, adminId);
        if (!ok) return BadRequest(new ApiResponse(false, "Failed to update setting"));
        return Ok(new ApiResponse(true, "Setting updated"));
    }
}
