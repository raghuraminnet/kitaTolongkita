using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Infrastructure.Data;
using KitaTolongKita.Infrastructure.Services;

namespace KitaTolongKita.Api.Controllers;

/// <summary>
/// Admin API for managing contributor KYC applications.
/// </summary>
[ApiController]
[Route("api/admin/contributor-applications")]
[Authorize(Policy = "Moderator")]
public class ContributorApplicationsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IPushNotificationService _push;
    private readonly ILogger<ContributorApplicationsController> _logger;

    public ContributorApplicationsController(
        AppDbContext db,
        IPushNotificationService push,
        ILogger<ContributorApplicationsController> logger)
    {
        _db = db;
        _push = push;
        _logger = logger;
    }

    private int CurrentAdminId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>List all applications with optional status filter.</summary>
    [HttpGet]
    public async Task<IActionResult> GetApplications(
        [FromQuery] string? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int size = 20)
    {
        var q = _db.ContributorApplications
            .AsNoTracking()
            .Include(a => a.User)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status))
            q = q.Where(a => a.Status == status);

        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * size).Take(size)
            .Select(a => new ApplicationListItem(
                a.Id, a.UserId, a.User!.FullName, a.User.Email, a.User.Phone,
                a.MobileNo, a.IcPassportNo, a.Nationality, a.Race, a.ResidentStatus,
                a.Status, a.RejectionReason, a.CreatedAt, a.ApprovedAt))
            .ToListAsync();

        return Ok(new PagedResult<ApplicationListItem>(items, total, page, size,
            (int)Math.Ceiling(total / (double)size)));
    }

    /// <summary>Get one application detail.</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetApplication(Guid id)
    {
        var a = await _db.ContributorApplications
            .AsNoTracking()
            .Include(a => a.User)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (a == null) return NotFound();
        return Ok(new ApplicationDetail(
            a.Id, a.UserId, a.User!.FullName, a.User.Email, a.User.Phone,
            a.MobileNo, a.IcPassportNo, a.Nationality, a.Race, a.ResidentStatus,
            a.Status, a.RejectionReason, a.CreatedAt, a.ReviewedAt, a.ApprovedAt,
            a.ReviewedBy));
    }

    /// <summary>Review an application: approve, hold, or reject.</summary>
    [HttpPatch("{id}/review")]
    public async Task<IActionResult> ReviewApplication(Guid id, [FromBody] ReviewApplicationRequest req)
    {
        var a = await _db.ContributorApplications
            .Include(a => a.User)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (a == null) return NotFound();
        if (a.Status != "Pending" && a.Status != "UnderReview")
            return BadRequest(new { success = false, message = $"Cannot review application with status '{a.Status}'" });

        a.Status = req.Action; // "Approved" | "OnHold" | "Rejected"
        a.ReviewedBy = CurrentAdminId;
        a.ReviewedAt = DateTime.UtcNow;
        a.UpdatedAt = DateTime.UtcNow;

        if (req.Action == "Approved")
        {
            a.ApprovedAt = DateTime.UtcNow;
            a.User!.IsContributor = true;
            a.User.ContributorSince = DateTime.UtcNow;
            a.User.ContributorRating = 0;
        }

        if (!string.IsNullOrEmpty(req.Reason))
            a.RejectionReason = req.Reason;

        await _db.SaveChangesAsync();

        // Send notification to applicant
        var title = req.Action switch {
            "Approved" => "🎉 Contributor Application Approved!",
            "OnHold" => "⏸️ Application Under Review",
            "Rejected" => "❌ Application Not Approved",
            _ => "Application Update"
        };
        var body = req.Action switch {
            "Approved" => "Congratulations! You are now a contributor. You can start posting group buy deals.",
            "OnHold" => "Your application is under further review. We'll update you soon.",
            "Rejected" => $"Your contributor application was not approved. Reason: {a.RejectionReason ?? "No reason provided."}",
            _ => "Your application status has been updated."
        };

        try
        {
            await _push.SendAndStoreAsync(a.UserId, $"application_{req.Action.ToLower()}",
                title, body, new { applicationId = a.Id.ToString() });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send application review notification to user {UserId}", a.UserId);
        }

        _logger.LogInformation("Admin {AdminId} set application {AppId} to {Action}",
            CurrentAdminId, id, req.Action);

        return Ok(new { success = true, message = $"Application {req.Action.ToLower()}", newStatus = req.Action });
    }

    /// <summary>List all approved contributors.</summary>
    [HttpGet("/api/admin/contributors")]
    public async Task<IActionResult> GetContributors([FromQuery] int page = 1, [FromQuery] int size = 20)
    {
        var q = _db.Users.AsNoTracking().Where(u => u.IsContributor);
        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(u => u.ContributorSince)
            .Skip((page - 1) * size).Take(size)
            .Select(u => new ContributorItem(
                u.Id, u.FullName, u.Email, u.Phone, u.AvatarUrl,
                u.ContributorSince ?? DateTime.UtcNow,
                u.ContributorRating ?? 0,
                u.CreatedAt))
            .ToListAsync();

        return Ok(new PagedResult<ContributorItem>(items, total, page, size,
            (int)Math.Ceiling(total / (double)size)));
    }

    /// <summary>Revoke a user's contributor status.</summary>
    [HttpPatch("/api/admin/contributors/{userId}/revoke")]
    public async Task<IActionResult> RevokeContributor(Guid userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();
        user.IsContributor = false;
        await _db.SaveChangesAsync();
        _logger.LogInformation("Contributor status revoked for user {UserId} by admin {AdminId}", userId, CurrentAdminId);
        return Ok(new { success = true, message = "Contributor status revoked" });
    }
}

// DTOs
public record ApplicationListItem(
    Guid Id, Guid UserId, string FullName, string Email, string? Phone,
    string MobileNo, string IcPassportNo, string Nationality, string Race, string ResidentStatus,
    string Status, string? RejectionReason, DateTime CreatedAt, DateTime? ApprovedAt
);

public record ApplicationDetail(
    Guid Id, Guid UserId, string FullName, string Email, string? Phone,
    string MobileNo, string IcPassportNo, string Nationality, string Race, string ResidentStatus,
    string Status, string? RejectionReason, DateTime CreatedAt, DateTime? ReviewedAt, DateTime? ApprovedAt,
    int? ReviewedBy
);

public record ContributorItem(
    Guid Id, string FullName, string Email, string? Phone, string? AvatarUrl,
    DateTime ContributorSince, decimal Rating, DateTime JoinedAt
);

public record ReviewApplicationRequest(string Action, string? Reason);
public record PagedResult<T>(List<T> Items, int TotalCount, int Page, int PageSize, int TotalPages);
