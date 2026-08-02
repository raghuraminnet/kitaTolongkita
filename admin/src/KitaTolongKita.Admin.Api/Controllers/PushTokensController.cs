using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitaTolongKita.Admin.Api.DTOs;
using KitaTolongKita.Admin.Api.Services;

namespace KitaTolongKita.Admin.Api.Controllers;

[ApiController]
[Route("api/push-tokens")]
[Authorize(Policy = "Moderator")]
public class PushTokensController : ControllerBase
{
    private readonly IAdminService _svc;

    public PushTokensController(IAdminService svc) => _svc = svc;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var result = await _svc.GetPushTokensAsync(search, page, pageSize);
        return Ok(new ApiResponse(true, null, result));
    }
}
