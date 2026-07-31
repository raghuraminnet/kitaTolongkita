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
    private readonly IMainDbService _mainDb;

    public AppUsersController(IMainDbService mainDb) => _mainDb = mainDb;

    [HttpGet]
    public async Task<IActionResult> GetUsers([FromQuery] string? search = null)
    {
        var users = await _mainDb.GetUsersAsync(search);
        var total = await _mainDb.GetUserCountAsync();
        return Ok(new { data = users, total, count = users.Count });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetUser(Guid id)
    {
        var user = await _mainDb.GetUserByIdAsync(id);
        if (user == null) return NotFound(new ApiResponse(false, "User not found"));
        return Ok(new ApiResponse(true, null, user));
    }
}
