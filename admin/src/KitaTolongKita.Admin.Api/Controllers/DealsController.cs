using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitaTolongKita.Admin.Api.DTOs;
using KitaTolongKita.Admin.Api.Services;

namespace KitaTolongKita.Admin.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "Viewer")]
public class DealsController : ControllerBase
{
    private readonly IAdminService _svc;

    public DealsController(IAdminService svc) => _svc = svc;

    [HttpGet("moderation/pending")]
    public async Task<IActionResult> GetPending(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _svc.GetPendingDealsAsync(page, pageSize);
        return Ok(result);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _svc.GetAllDealsAsync(status, search, page, pageSize);
        return Ok(result);
    }

    [Authorize(Policy = "Moderator")]
    [HttpPost("moderation/{id}/approve")]
    public async Task<IActionResult> Approve(string id)
    {
        var adminId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var ok = await _svc.ApproveDealAsync(id, adminId);
        if (!ok) return BadRequest(new ApiResponse(false, "Failed to approve deal"));
        return Ok(new ApiResponse(true, "Deal approved"));
    }

    [Authorize(Policy = "Moderator")]
    [HttpPost("moderation/{id}/reject")]
    public async Task<IActionResult> Reject(string id, [FromBody] RejectRequest req)
    {
        var adminId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var ok = await _svc.RejectDealAsync(id, req.Reason ?? "", adminId);
        if (!ok) return BadRequest(new ApiResponse(false, "Failed to reject deal"));
        return Ok(new ApiResponse(true, "Deal rejected"));
    }

    [Authorize(Policy = "Moderator")]
    [HttpPatch("{id}/feature")]
    public async Task<IActionResult> Feature(string id, [FromBody] FeatureRequest req)
    {
        var adminId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var ok = await _svc.FeatureDealAsync(id, req.Featured, adminId);
        if (!ok) return BadRequest(new ApiResponse(false, "Failed to update feature status"));
        return Ok(new ApiResponse(true, req.Featured ? "Deal featured" : "Deal unfeatured"));
    }
}

public record RejectRequest(string? Reason);
public record FeatureRequest(bool Featured);
