using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitaTolongKita.Admin.Api.DTOs;
using KitaTolongKita.Admin.Api.Services;

namespace KitaTolongKita.Admin.Api.Controllers;

[ApiController]
[Route("api/app-deals")]
[Authorize(Policy = "Viewer")]
public class AppDealsController : ControllerBase
{
    private readonly IMainDbService _mainDb;

    public AppDealsController(IMainDbService mainDb) => _mainDb = mainDb;

    [HttpGet]
    public async Task<IActionResult> GetDeals(
        [FromQuery] string? status = null,
        [FromQuery] string? search = null)
    {
        var deals = await _mainDb.GetDealsAsync(status, search);
        var total = await _mainDb.GetDealCountAsync(status);
        return Ok(new { data = deals, total, count = deals.Count });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetDeal(Guid id)
    {
        var deal = await _mainDb.GetDealByIdAsync(id);
        if (deal == null) return NotFound(new ApiResponse(false, "Deal not found"));
        return Ok(new ApiResponse(true, null, deal));
    }
}
