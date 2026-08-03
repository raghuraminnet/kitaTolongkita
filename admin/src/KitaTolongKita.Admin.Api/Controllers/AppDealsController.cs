using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitaTolongKita.Admin.Api.Services;

namespace KitaTolongKita.Admin.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/app-deals")]
public class AppDealsController : ControllerBase
{
    private readonly IAdminService _svc;
    public AppDealsController(IAdminService svc) => _svc = svc;

    [HttpGet]
    public async Task<IActionResult> GetAllDeals(
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _svc.GetAllDealsAsync(status, search, page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetDeal(Guid id)
    {
        // Uses Kita API via IAdminService.GetAllDealsAsync — for a full detail view
        // we fetch from the list (admin panel uses this for quick lookups)
        var result = await _svc.GetAllDealsAsync(null, null, 1, 500);
        var deal = result.Items.FirstOrDefault(d => d.Id == id.ToString());
        if (deal == null) return NotFound();
        return Ok(deal);
    }
}
