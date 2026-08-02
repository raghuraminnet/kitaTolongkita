using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitaTolongKita.Infrastructure.Services;

namespace KitaTolongKita.Api.Controllers;

[ApiController]
[Authorize]
public class RatingsController : ControllerBase
{
    private readonly IRatingService _rating;
    private readonly ILookupService _lookup;
    public RatingsController(IRatingService rating, ILookupService lookup)
    {
        _rating = rating;
        _lookup = lookup;
    }

    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>Submit a rating for a delivered lookup.</summary>
    [HttpPost("lookups/{lookupId}/rate")]
    public async Task<IActionResult> Rate(Guid lookupId, [FromBody] RateRequest req)
    {
        if (req.Rating < 1 || req.Rating > 5)
            return BadRequest(new { success = false, message = "Rating must be 1-5" });

        var result = await _rating.RateContributorAsync(lookupId, CurrentUserId, req.Rating, req.Review);
        if (result == null)
            return BadRequest(new { success = false, message = "Cannot rate this lookup. It must be delivered and not already rated." });

        return Ok(new { success = true, message = "Rating submitted", ratingId = result.Id });
    }

    /// <summary>Get a contributor's rating summary.</summary>
    [HttpGet("contributors/{userId}/rating-summary")]
    public async Task<IActionResult> GetRatingSummary(Guid userId)
    {
        var summary = await _rating.GetContributorRatingSummaryAsync(userId);
        return Ok(summary);
    }

    /// <summary>Get ratings received by a contributor.</summary>
    [HttpGet("contributors/{userId}/ratings")]
    public async Task<IActionResult> GetRatings(Guid userId, [FromQuery] int page = 1, [FromQuery] int size = 20)
    {
        if (size > 50) size = 50;
        var ratings = await _rating.GetContributorRatingsAsync(userId, page, size);
        return Ok(new { ratings, page, size });
    }

    /// <summary>Get my lookups.</summary>
    [HttpGet("lookups")]
    public async Task<IActionResult> GetMyLookups([FromQuery] string? status = null)
    {
        var lookups = await _lookup.GetMyLookupsAsync(CurrentUserId, status);
        return Ok(new { lookups });
    }

    /// <summary>Get detail of one of my lookups.</summary>
    [HttpGet("lookups/{lookupId}")]
    public async Task<IActionResult> GetLookupDetail(Guid lookupId)
    {
        var detail = await _lookup.GetLookupDetailAsync(lookupId, CurrentUserId);
        if (detail == null) return NotFound(new { success = false, message = "Lookup not found" });
        return Ok(detail);
    }

    /// <summary>Join a group buy deal as a lookup.</summary>
    [HttpPost("deals/{dealId}/join")]
    public async Task<IActionResult> JoinDeal(Guid dealId, [FromQuery] int quantity = 1)
    {
        var result = await _lookup.JoinDealAsync(dealId, CurrentUserId, quantity);
        if (result == null)
            return BadRequest(new { success = false, message = "Cannot join this deal. It may not exist, is not a group buy, or you've already joined." });
        return Ok(new { success = true, bookingId = result.BookingId, status = result.Status });
    }
}

public record RateRequest(int Rating, string? Review);
