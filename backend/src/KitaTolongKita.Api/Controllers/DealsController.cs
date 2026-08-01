using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using KitaTolongKita.Core.DTOs;
using KitaTolongKita.Core.Interfaces;
using KitaTolongKita.Api.Middleware;

namespace KitaTolongKita.Api.Controllers;

[ApiController]
[Route("api/deals")]
public class DealsController : ControllerBase
{
    private readonly IDealService _deals;
    private readonly ILogger<DealsController> _logger;

    public DealsController(IDealService deals, ILogger<DealsController> logger)
    {
        _deals = deals;
        _logger = logger;
    }

    // ── Search ─────────────────────────────────────────────────────────────────

    /// <summary>Search active deals with optional location, category, text, and sort filters.</summary>
    [HttpGet]
    public async Task<IActionResult> GetDeals([FromQuery] DealSearchRequest request)
    {
        // Inject location from middleware if not provided.
        // DealSearchRequest is a positional record → its properties are init-only,
        // so we use `with` to clone a new instance with the additional values.
        var userLat = HttpContext.GetUserLatitude();
        var userLon = HttpContext.GetUserLongitude();

        if (!request.Latitude.HasValue && userLat.HasValue)
            request = request with { Latitude = userLat };
        if (!request.Longitude.HasValue && userLon.HasValue)
            request = request with { Longitude = userLon };

        var result = await _deals.SearchDealsAsync(request);
        return Ok(result);
    }

    /// <summary>Get a single deal by ID.</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetDeal(Guid id)
    {
        var deal = await _deals.GetDealByIdAsync(id);
        return deal == null ? NotFound() : Ok(deal);
    }

    /// <summary>Get deals near a location that need community verification.</summary>
    [Authorize]
    [HttpGet("nearby-pending-verification")]
    public async Task<IActionResult> GetNearbyPendingVerification([FromQuery] NearbyDealRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var deals = await _deals.GetNearbyPendingVerificationAsync(
            request.Latitude, request.Longitude, request.RadiusKm, userId.Value);
        return Ok(deals);
    }

    /// <summary>Get all deals posted by the authenticated user (organizer).</summary>
    [Authorize]
    [HttpGet("mine")]
    public async Task<IActionResult> GetMyDeals()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var deals = await _deals.GetMyDealsAsync(userId.Value);
        return Ok(deals);
    }

    /// <summary>Get public active deals posted by a specific user (for public profile page).</summary>
    [HttpGet("user/{userId:guid}")]
    public async Task<IActionResult> GetDealsByUser(Guid userId)
    {
        var deals = await _deals.GetDealsByUserAsync(userId);
        return Ok(deals);
    }

    /// <summary>Get deals similar to a location — shown when user posts a deal to warn about duplicates.</summary>
    [HttpGet("suggest-nearby")]
    public async Task<IActionResult> SuggestNearby([FromQuery] NearbyDealRequest request)
    {
        var deals = await _deals.SuggestNearbyDealsAsync(
            request.Latitude, request.Longitude, request.RadiusKm, request.Category);
        return Ok(deals);
    }

    // ── Create ─────────────────────────────────────────────────────────────────

    /// <summary>Create a new group deal. Requires authentication.</summary>
    [Authorize]
    [HttpPost]
    public async Task<IActionResult> CreateDeal([FromBody] CreateDealRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        try
        {
            // Use location from header if not in body. Same `with` pattern as above.
            var userLat = HttpContext.GetUserLatitude();
            var userLon = HttpContext.GetUserLongitude();

            if (!request.Latitude.HasValue && userLat.HasValue)
                request = request with { Latitude = userLat };
            if (!request.Longitude.HasValue && userLon.HasValue)
                request = request with { Longitude = userLon };

            var deal = await _deals.CreateDealAsync(request, userId.Value);
            return CreatedAtAction(nameof(GetDeal), new { id = deal.Id }, deal);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create deal");
            return BadRequest(new { message = "Failed to create deal." });
        }
    }

    // ── Reactions ──────────────────────────────────────────────────────────────

    /// <summary>Toggle upvote ("Real Deal") on a deal. Auth required.</summary>
    [Authorize]
    [HttpPost("{id:guid}/upvote")]
    public async Task<IActionResult> ToggleUpvote(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        try
        {
            var summary = await _deals.ToggleUpvoteAsync(id, userId.Value);
            return Ok(summary);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>Toggle like on a deal. Auth required.</summary>
    [Authorize]
    [HttpPost("{id:guid}/like")]
    public async Task<IActionResult> ToggleLike(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        try
        {
            var summary = await _deals.ToggleLikeAsync(id, userId.Value);
            return Ok(summary);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>Get current user's reaction state on a deal + counts.</summary>
    [Authorize]
    [HttpGet("{id:guid}/reactions")]
    public async Task<IActionResult> GetReactions(Guid id)
    {
        var userId = GetUserId();
        var summary = await _deals.GetReactionsAsync(id, userId);
        return Ok(summary);
    }

    // ── Verification ──────────────────────────────────────────────────────────

    /// <summary>Verify whether a deal offer is still available at the location.</summary>
    [Authorize]
    [HttpPost("{id:guid}/verify")]
    public async Task<IActionResult> VerifyDeal(Guid id, [FromBody] DealVerificationRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        try
        {
            await _deals.VerifyDealAsync(id, userId.Value, request.OfferStillAvailable, request.Notes);
            return Ok(new { message = "Verification recorded. Thanks!" });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    // ── Orders ───────────────────────────────────────────────────────────────

    /// <summary>Join a group deal (create an order). Requires authentication.</summary>
    [Authorize]
    [HttpPost("{id:guid}/join")]
    public async Task<IActionResult> JoinDeal(Guid id, [FromBody] JoinDealRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        try
        {
            var order = await _deals.JoinDealAsync(id, userId.Value, request.Quantity, request.Notes);
            return Ok(order);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Get current user's orders.</summary>
    [Authorize]
    [HttpGet("orders")]
    public async Task<IActionResult> GetMyOrders()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var orders = await _deals.GetUserOrdersAsync(userId.Value);
        return Ok(orders);
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private Guid? GetUserId()
    {
        var idStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(idStr, out var id) ? id : null;
    }
}

public record JoinDealRequest(int Quantity = 1, string? Notes = null);
