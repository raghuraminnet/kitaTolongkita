using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitaTolongKita.Admin.Api.DTOs;
using KitaTolongKita.Admin.Api.Services;

namespace KitaTolongKita.Admin.Api.Controllers;

[ApiController]
[Route("api/conversations")]
[Authorize(Policy = "Moderator")]
public class ConversationsController : ControllerBase
{
    private readonly IAdminService _svc;

    public ConversationsController(IAdminService svc) => _svc = svc;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _svc.GetConversationsAsync(search, page, pageSize);
        return Ok(new ApiResponse(true, null, result));
    }

    [HttpGet("{conversationId}/messages")]
    public async Task<IActionResult> GetMessages(string conversationId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var result = await _svc.GetChatMessagesAsync(conversationId, page, pageSize);
        return Ok(new ApiResponse(true, null, result));
    }
}
