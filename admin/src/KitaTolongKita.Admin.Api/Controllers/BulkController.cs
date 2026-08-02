using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitaTolongKita.Admin.Api.DTOs;
using KitaTolongKita.Admin.Api.Services;

namespace KitaTolongKita.Admin.Api.Controllers;

[ApiController]
[Route("api/bulk")]
[Authorize(Policy = "Moderator")]
public class BulkController : ControllerBase
{
    private readonly IAdminService _svc;

    public BulkController(IAdminService svc) => _svc = svc;

    [HttpPost("moderate-deals")]
    public async Task<IActionResult> ModerateDeals([FromBody] BulkActionRequest req)
    {
        if (req.Ids == null || req.Ids.Count == 0)
            return BadRequest(new ApiResponse(false, "No IDs provided."));
        if (string.IsNullOrWhiteSpace(req.Action))
            return BadRequest(new ApiResponse(false, "Action is required."));

        var adminId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var result = await _svc.BulkModerateDealsAsync(req, adminId);
        return Ok(new ApiResponse(true, $"Processed {result.Succeeded} deals, {result.Failed} failed.", result));
    }
}
