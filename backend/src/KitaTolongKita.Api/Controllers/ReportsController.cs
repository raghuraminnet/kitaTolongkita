using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Core.Interfaces;
using KitaTolongKita.Infrastructure.Data;

namespace KitaTolongKita.Api.Controllers;

[ApiController]
[Route("api/reports")]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reports;
    private readonly AppDbContext _db;
    private readonly ILogger<ReportsController> _logger;

    public ReportsController(IReportService reports, AppDbContext db, ILogger<ReportsController> logger)
    {
        _reports = reports;
        _db = db;
        _logger = logger;
    }

    /// <summary>Submit a report against a deal or user.</summary>
    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Submit([FromBody] CreateReportRequest request)
    {
        var reporterId = GetUserId();
        if (reporterId == null) return Unauthorized();

        if (request.Reasons == null || request.Reasons.Count == 0)
            return BadRequest("At least one report reason is required.");

        if (request.Reasons.Contains(ReportReason.Other) && string.IsNullOrWhiteSpace(request.Description))
            return BadRequest("A description is required when selecting 'Other'.");

        try
        {
            var dto = await _reports.SubmitAsync(reporterId.Value, request);
            return Ok(dto);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    /// <summary>List reports filed by the current user (for mobile "My Reports").</summary>
    [Authorize]
    [HttpGet("mine")]
    public async Task<IActionResult> GetMyReports()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var reports = await _reports.GetByReporterAsync(userId.Value);
        return Ok(reports);
    }

    /// <summary>List all reports (admin only).</summary>
    [HttpGet]
    [Authorize]
    public async Task<IActionResult> ListReports([FromQuery] ReportFilter filter)
    {
        var (items, total) = await _reports.ListAsync(filter);
        return Ok(new { items, total, page = filter.Page, pageSize = filter.PageSize });
    }

    /// <summary>Get a single report's full details (admin only).</summary>
    [HttpGet("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> GetReport(Guid id)
    {
        var dto = await _reports.GetByIdAsync(id);
        return dto == null ? NotFound() : Ok(dto);
    }

    /// <summary>Admin takes a corrective action on a report.</summary>
    [HttpPost("{id:guid}/action")]
    [Authorize]
    public async Task<IActionResult> TakeAction(Guid id, [FromBody] TakeReportActionRequest request)
    {
        var adminId = GetUserId();
        if (adminId == null) return Unauthorized();

        try
        {
            var dto = await _reports.TakeActionAsync(id, adminId.Value, request);
            return Ok(dto);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>Admin updates the status of a report (e.g. dismiss).</summary>
    [HttpPatch("{id:guid}/status")]
    [Authorize]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateReportStatusRequest request)
    {
        var adminId = GetUserId();
        if (adminId == null) return Unauthorized();

        if (!Enum.TryParse<ReportStatus>(request.Status, true, out var status))
            return BadRequest("Invalid status value.");

        try
        {
            var dto = await _reports.UpdateStatusAsync(id, adminId.Value, status, request.Notes);
            return Ok(dto);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    // ── Admin: reports overview stats ────────────────────────────────────────

    /// <summary>Get report counts by status (for admin dashboard).</summary>
    [HttpGet("stats")]
    [Authorize]
    public async Task<IActionResult> GetStats()
    {
        var stats = await _db.Reports
            .GroupBy(r => r.Status)
            .Select(g => new { status = g.Key.ToString(), count = g.Count() })
            .ToListAsync();

        var thisWeek = DateTime.UtcNow.AddDays(-7);
        var resolvedThisWeek = await _db.Reports
            .CountAsync(r => r.ResolvedAt >= thisWeek);

        return Ok(new
        {
            byStatus = stats,
            resolvedThisWeek,
            total = await _db.Reports.CountAsync(),
            newCount = await _db.Reports.CountAsync(r => r.Status == ReportStatus.New),
            underReviewCount = await _db.Reports.CountAsync(r => r.Status == ReportStatus.UnderReview),
        });
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Guid? GetUserId()
    {
        var idStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(idStr, out var id) ? id : null;
    }
}

public record UpdateReportStatusRequest(string Status, string? Notes);
