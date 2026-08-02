using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitaTolongKita.Admin.Api.DTOs;
using KitaTolongKita.Admin.Api.Services;

namespace KitaTolongKita.Admin.Api.Controllers;

[ApiController]
[Route("api/saved-lists")]
[Authorize(Policy = "Moderator")]
public class SavedListsController : ControllerBase
{
    private readonly IAdminService _svc;

    public SavedListsController(IAdminService svc) => _svc = svc;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _svc.GetSavedListsAsync(search, page, pageSize);
        return Ok(new ApiResponse(true, null, result));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var result = await _svc.GetSavedListDetailAsync(id);
        if (result == null) return NotFound(new ApiResponse(false, "Saved list not found."));
        return Ok(new ApiResponse(true, null, result));
    }
}
