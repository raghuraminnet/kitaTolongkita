using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KitaTolongKita.Admin.Api.Data;
using KitaTolongKita.Admin.Api.DTOs;

namespace KitaTolongKita.Admin.Api.Controllers;

[ApiController]
[Route("api/admin/contributor-applications")]
[Authorize(Policy = "Moderator")]
public class ContributorApplicationsController : ControllerBase
{
    private readonly MainDbContext _db;
    public ContributorApplicationsController(MainDbContext db) => _db = db;

    private int AdminId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

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
            .Select(a => new
            {
                a.Id,
                a.UserId,
                fullName = a.User!.FullName,
                email = a.User.Email,
                phone = a.User.Phone,
                a.MobileNo,
                a.IcPassportNo,
                a.Nationality,
                a.Race,
                a.ResidentStatus,
                a.Status,
                a.RejectionReason,
                a.CreatedAt,
                a.ApprovedAt
            })
            .ToListAsync();

        return Ok(new PagedResult<dynamic>(items, total, page, size,
            (int)Math.Ceiling(total / (double)size)));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetApplication(Guid id)
    {
        var a = await _db.ContributorApplications
            .AsNoTracking()
            .Include(a => a.User)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (a == null) return NotFound();
        return Ok(a);
    }

    [HttpPatch("{id:guid}/review")]
    public async Task<IActionResult> ReviewApplication(Guid id, [FromBody] ReviewAppRequest req)
    {
        var a = await _db.ContributorApplications.FindAsync(id);
        if (a == null) return NotFound();

        if (a.Status != "Pending" && a.Status != "UnderReview")
            return BadRequest(new ApiResponse(false, $"Cannot review application with status '{a.Status}'"));

        a.Status = req.Action;
        a.ReviewedBy = AdminId;
        a.ReviewedAt = DateTime.UtcNow;

        if (req.Action == "Approved")
        {
            a.ApprovedAt = DateTime.UtcNow;
            var user = await _db.Users.FindAsync(a.UserId);
            if (user != null)
            {
                user.IsContributor = true;
                user.ContributorSince = DateTime.UtcNow;
            }
        }

        if (!string.IsNullOrEmpty(req.Reason))
            a.RejectionReason = req.Reason;

        await _db.SaveChangesAsync();
        return Ok(new ApiResponse(true, $"Application {req.Action.ToLower()}", new { status = a.Status }));
    }
}

public record ReviewAppRequest(string Action, string? Reason);
