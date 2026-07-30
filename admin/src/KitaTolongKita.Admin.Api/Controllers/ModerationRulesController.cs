using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitaTolongKita.Admin.Api.DTOs;
using KitaTolongKita.Admin.Api.Services;

namespace KitaTolongKita.Admin.Api.Controllers;

[ApiController]
[Route("api/moderation-rules")]
[Authorize(Policy = "Moderator")]
public class ModerationRulesController : ControllerBase
{
    private readonly IAdminService _svc;

    public ModerationRulesController(IAdminService svc) => _svc = svc;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? category = null)
    {
        var rules = await _svc.GetModerationRulesAsync(category);
        return Ok(new ApiResponse(true, null, rules));
    }

    [HttpPatch("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateModerationRuleRequest req)
    {
        var rule = await _svc.UpdateModerationRuleAsync(id, req,
            int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value));
        if (rule == null) return NotFound(new ApiResponse(false, "Rule not found."));
        return Ok(new ApiResponse(true, "Rule updated.", rule));
    }
}
