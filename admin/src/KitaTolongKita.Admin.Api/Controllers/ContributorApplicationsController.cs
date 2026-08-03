using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitaTolongKita.Admin.Api.DTOs;
using KitaTolongKita.Admin.Api.Services;

namespace KitaTolongKita.Admin.Api.Controllers;

[ApiController]
[Route("api/admin/contributor-applications")]
[Authorize(Policy = "Moderator")]
public class ContributorApplicationsController : ControllerBase
{
    private readonly IAdminService _svc;
    public ContributorApplicationsController(IAdminService svc) => _svc = svc;

    private int AdminId => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;

    [HttpGet]
    public async Task<IActionResult> GetApplications(
        [FromQuery] string? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int size = 20)
    {
        var result = await _svc.GetContributorApplicationsAsync(status, page, size);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetApplication(Guid id)
    {
        // Uses list endpoint for quick lookup; returns full list and find
        var result = await _svc.GetContributorApplicationsAsync(null, 1, 500);
        var app = result.Items.FirstOrDefault(a => a.Id == id);
        if (app == null) return NotFound();
        return Ok(app);
    }

    [HttpPatch("{id:guid}/review")]
    public async Task<IActionResult> ReviewApplication(Guid id, [FromBody] ReviewAppRequest req)
    {
        var ok = await _svc.ReviewContributorApplicationAsync(id, req.Action, req.Reason, AdminId);
        if (!ok) return BadRequest(new ApiResponse(false, "Failed to review application"));
        return Ok(new ApiResponse(true, $"Application {req.Action.ToLower()}"));
    }
}

public record ReviewAppRequest(string Action, string? Reason);
