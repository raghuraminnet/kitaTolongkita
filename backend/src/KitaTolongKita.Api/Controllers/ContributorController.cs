using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitaTolongKita.Infrastructure.Services;

namespace KitaTolongKita.Api.Controllers;

[ApiController]
[Route("api/contributor")]
[Authorize]
public class ContributorController : ControllerBase
{
    private readonly IContributorService _svc;
    private readonly ILookupService _lookup;

    public ContributorController(IContributorService svc, ILookupService lookup)
    {
        _svc = svc;
        _lookup = lookup;
    }

    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // ── Application ──────────────────────────────────────────────────────────────

    /// <summary>Submit a contributor KYC application.</summary>
    [HttpPost("apply")]
    public async Task<IActionResult> Apply([FromBody] ContributorApplicationRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.MobileNo) ||
            string.IsNullOrWhiteSpace(req.IcPassportNo) ||
            string.IsNullOrWhiteSpace(req.Nationality) ||
            string.IsNullOrWhiteSpace(req.Race) ||
            string.IsNullOrWhiteSpace(req.ResidentStatus))
            return BadRequest(new { success = false, message = "All KYC fields are required" });

        var result = await _svc.ApplyAsync(CurrentUserId, req);
        if (result == null)
            return Conflict(new { success = false, message = "You already have an active application or are already a contributor" });

        return Ok(new { success = true, message = "Application submitted for review", applicationId = result.Id });
    }

    /// <summary>Get status of my contributor application.</summary>
    [HttpGet("application/status")]
    public async Task<IActionResult> GetApplicationStatus()
    {
        var status = await _svc.GetMyApplicationStatusAsync(CurrentUserId);
        if (status == null)
            return Ok(new { hasApplication = false });
        return Ok(new { hasApplication = true, status.Id, status.Status, status.RejectionReason, status.CreatedAt, status.ApprovedAt });
    }

    /// <summary>Withdraw pending application.</summary>
    [HttpDelete("application")]
    public async Task<IActionResult> WithdrawApplication()
    {
        var ok = await _svc.WithdrawApplicationAsync(CurrentUserId);
        if (!ok) return NotFound(new { success = false, message = "No pending application found" });
        return Ok(new { success = true, message = "Application withdrawn" });
    }

    // ── Group Buy Deals ─────────────────────────────────────────────────────────

    /// <summary>Create a group buy deal (contributor only).</summary>
    [HttpPost("deals")]
    public async Task<IActionResult> CreateDeal([FromBody] CreateGroupBuyDealRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Title) || req.OriginalPrice <= 0 || req.GroupPrice <= 0)
            return BadRequest(new { success = false, message = "Invalid deal data" });

        var deal = await _svc.CreateGroupBuyDealAsync(CurrentUserId, req);
        if (deal == null)
            return BadRequest(new { success = false, message = "Failed to create deal" });

        return Created($"/api/contributor/deals/{deal.Id}", new { success = true, dealId = deal.Id });
    }

    /// <summary>List my group buy deals.</summary>
    [HttpGet("deals")]
    public async Task<IActionResult> GetMyDeals([FromQuery] string? status = null)
    {
        var deals = await _svc.GetMyDealsAsync(CurrentUserId, status);
        return Ok(new { deals });
    }

    /// <summary>Update deal lookup status (Open → Secured → InProcess → Dispatched → Completed).</summary>
    [HttpPatch("deals/{dealId}/status")]
    public async Task<IActionResult> UpdateDealStatus(Guid dealId, [FromBody] UpdateDealStatusRequest req)
    {
        var ok = await _svc.UpdateDealLookupStatusAsync(dealId, req.Status, 0); // adminId=0 for self
        if (!ok) return BadRequest(new { success = false, message = "Invalid status or deal not found" });
        return Ok(new { success = true, message = $"Deal status updated to {req.Status}" });
    }

    /// <summary>List all lookups for one of my deals.</summary>
    [HttpGet("deals/{dealId}/lookups")]
    public async Task<IActionResult> GetDealLookups(Guid dealId, [FromQuery] string? status = null)
    {
        var lookups = await _svc.GetDealLookupsAsync(dealId, status);
        return Ok(new { lookups });
    }

    /// <summary>Update a specific lookup's status.</summary>
    [HttpPatch("lookups/{lookupId}/status")]
    public async Task<IActionResult> UpdateLookupStatus(Guid lookupId, [FromBody] UpdateLookupStatusRequest req)
    {
        var ok = await _svc.UpdateLookupStatusAsync(lookupId, req.Status, 0);
        if (!ok) return BadRequest(new { success = false, message = "Invalid status or lookup not found" });
        return Ok(new { success = true, message = $"Lookup status updated to {req.Status}" });
    }

    /// <summary>Scan QR code to mark lookup as delivered.</summary>
    [HttpPost("lookups/{lookupId}/verify-qr")]
    public async Task<IActionResult> VerifyQr(Guid lookupId, [FromBody] VerifyQrRequest req)
    {
        var ok = await _svc.VerifyQrAsync(lookupId, req.QrContent, CurrentUserId);
        if (!ok) return BadRequest(new { success = false, message = "Invalid QR code or lookup not found" });
        return Ok(new { success = true, message = "Delivery confirmed!" });
    }
}

public record UpdateDealStatusRequest(string Status);
public record UpdateLookupStatusRequest(string Status);
public record VerifyQrRequest(string QrContent);
