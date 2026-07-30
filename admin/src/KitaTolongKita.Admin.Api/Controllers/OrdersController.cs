using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitaTolongKita.Admin.Api.DTOs;
using KitaTolongKita.Admin.Api.Services;

namespace KitaTolongKita.Admin.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "Viewer")]
public class OrdersController : ControllerBase
{
    private readonly IAdminService _svc;

    public OrdersController(IAdminService svc) => _svc = svc;

    [HttpGet]
    public async Task<IActionResult> GetOrders(
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _svc.GetOrdersAsync(status, search, page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetOrder(string id)
    {
        var order = await _svc.GetOrderDetailAsync(id);
        if (order == null) return NotFound(new ApiResponse(false, "Order not found"));
        return Ok(new ApiResponse(true, null, order));
    }

    [Authorize(Policy = "Moderator")]
    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateStatus(string id, [FromBody] UpdateOrderStatusRequest req)
    {
        var adminId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var ok = await _svc.UpdateOrderStatusAsync(id, req.Status, adminId);
        if (!ok) return BadRequest(new ApiResponse(false, "Failed to update order status"));
        return Ok(new ApiResponse(true, $"Order status updated to {req.Status}"));
    }
}

public record UpdateOrderStatusRequest(string Status);
