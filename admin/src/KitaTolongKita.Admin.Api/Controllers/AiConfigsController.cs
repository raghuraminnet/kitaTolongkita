using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitaTolongKita.Admin.Api.DTOs;
using KitaTolongKita.Admin.Api.Services;

namespace KitaTolongKita.Admin.Api.Controllers;

[ApiController]
[Route("api/ai-configs")]
[Authorize(Policy = "Viewer")]
public class AiConfigsController : ControllerBase
{
    private readonly IAdminService _svc;
    private readonly IAiTestService _aiTest;

    public AiConfigsController(IAdminService svc, IAiTestService aiTest)
    {
        _svc = svc;
        _aiTest = aiTest;
    }

    private int GetAdminId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var configs = await _svc.GetAiConfigsAsync();
        return Ok(new ApiResponse(true, null, configs));
    }

    [HttpGet("active")]
    public async Task<IActionResult> GetActive()
    {
        var config = await _svc.GetActiveAiConfigAsync();
        return Ok(new ApiResponse(true, null, config));
    }

    [Authorize(Policy = "SuperAdmin")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAiConfigRequest req)
    {
        var item = await _svc.CreateAiConfigAsync(req, GetAdminId());
        if (item == null) return BadRequest(new ApiResponse(false, "A config with this name already exists."));
        return Ok(new ApiResponse(true, "AI config created.", item));
    }

    [Authorize(Policy = "SuperAdmin")]
    [HttpPatch("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateAiConfigRequest req)
    {
        var item = await _svc.UpdateAiConfigAsync(id, req, GetAdminId());
        if (item == null) return NotFound(new ApiResponse(false, "AI config not found."));
        return Ok(new ApiResponse(true, "AI config updated.", item));
    }

    [Authorize(Policy = "SuperAdmin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await _svc.DeleteAiConfigAsync(id, GetAdminId());
        if (!ok) return BadRequest(new ApiResponse(false, "Cannot delete this AI config."));
        return Ok(new ApiResponse(true, "AI config deleted."));
    }

    [HttpPost("test")]
    public async Task<IActionResult> TestConnection([FromBody] TestAiConnectionRequest req)
    {
        var result = await _aiTest.TestConnectionAsync(req);
        return Ok(result);
    }
}
