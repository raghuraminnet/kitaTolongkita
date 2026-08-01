using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitaTolongKita.Core.DTOs;
using KitaTolongKita.Core.Interfaces;

namespace KitaTolongKita.Api.Controllers;

[ApiController]
[Route("api/saved")]
[Authorize]
public class SavedDealsController : ControllerBase
{
    private readonly ISavedDealService _saved;
    private readonly IDealService _deals;

    public SavedDealsController(ISavedDealService saved, IDealService deals)
    {
        _saved = saved;
        _deals = deals;
    }

    private Guid UserId
    {
        get
        {
            var str = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(str, out var id) ? id : Guid.Empty;
        }
    }

    // ─── Lists ────────────────────────────────────────────────────────────────

    /// <summary>Get all of the current user's saved lists.</summary>
    [HttpGet("lists")]
    public async Task<IActionResult> GetMyLists()
    {
        var lists = await _saved.GetMyListsAsync(UserId);
        return Ok(lists);
    }

    /// <summary>Create a new saved list.</summary>
    [HttpPost("lists")]
    public async Task<IActionResult> CreateList([FromBody] CreateSavedListRequest req)
    {
        try
        {
            var list = await _saved.CreateListAsync(UserId, req.Name, req.IsPublic);
            return Created($"/api/saved/lists/{list.Id}", list);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Update a list's name or visibility.</summary>
    [HttpPatch("lists/{listId}")]
    public async Task<IActionResult> UpdateList(Guid listId, [FromBody] UpdateSavedListRequest req)
    {
        var list = await _saved.UpdateListAsync(UserId, listId, req.Name, req.IsPublic);
        return list == null ? NotFound() : Ok(list);
    }

    /// <summary>Delete a saved list and all its deals.</summary>
    [HttpDelete("lists/{listId}")]
    public async Task<IActionResult> DeleteList(Guid listId)
    {
        var deleted = await _saved.DeleteListAsync(UserId, listId);
        return deleted ? Ok() : NotFound();
    }

    // ─── Saved Deals ──────────────────────────────────────────────────────────

    /// <summary>Save a deal to a list. Use listId or newListName.</summary>
    [HttpPost]
    public async Task<IActionResult> SaveDeal([FromBody] SaveDealRequest req)
    {
        try
        {
            var saved = await _saved.SaveDealAsync(UserId, req.DealId, req.ListId, req.NewListName);
            return Created($"/api/saved/{saved.Id}", saved);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Remove a deal from a saved list.</summary>
    [HttpDelete]
    public async Task<IActionResult> UnsaveDeal([FromBody] UnsaveDealRequest req)
    {
        var removed = await _saved.UnsaveDealAsync(UserId, req.DealId, req.ListId);
        return removed ? Ok() : NotFound();
    }

    /// <summary>Get all saved deals, optionally filtered by listId.</summary>
    [HttpGet]
    public async Task<IActionResult> GetSavedDeals([FromQuery] Guid? listId = null)
    {
        var deals = await _saved.GetSavedDealsAsync(UserId, listId);
        return Ok(deals);
    }

    /// <summary>Get the list IDs that a specific deal is saved to by the current user.</summary>
    [HttpGet("check/{dealId}")]
    public async Task<IActionResult> CheckSaved(Guid dealId)
    {
        var listIds = await _saved.GetSavedListIdsAsync(UserId, dealId);
        return Ok(listIds);
    }
}
