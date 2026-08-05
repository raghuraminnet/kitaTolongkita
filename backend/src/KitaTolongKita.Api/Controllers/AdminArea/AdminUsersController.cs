using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Infrastructure.Data;

namespace KitaTolongKita.Api.Controllers.AdminArea;

[ApiController]
[Route("api/admin-users")]
[Authorize(AuthenticationSchemes = "AdminJwt", Policy = "SuperAdmin")]
public class AdminUsersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<AdminUsersController> _logger;

    public AdminUsersController(AppDbContext db, ILogger<AdminUsersController> logger)
    {
        _db = db;
        _logger = logger;
    }

    private int GetAdminId() =>
        int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    private async Task LogActionAsync(string action, string entityType, string entityId, string? details = null)
    {
        var adminId = GetAdminId();
        var admin = await _db.AdminUsers.FindAsync(adminId);
        _db.AuditLogs.Add(new AuditLog
        {
            AdminUserId = adminId,
            AdminEmail = admin?.Email ?? "unknown",
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Details = details,
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var users = await _db.AdminUsers
            .AsNoTracking()
            .OrderBy(x => x.CreatedAt)
            .Select(u => new AdminUserItem(
                u.Id, u.Email, u.FullName, u.Role, u.IsActive, u.LastLoginAt, u.CreatedAt))
            .ToListAsync();

        return Ok(new AdminApiResponse(true, null, users));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAdminUserRequest req)
    {
        var existing = await _db.AdminUsers.AnyAsync(u => u.Email == req.Email);
        if (existing)
            return BadRequest(new AdminApiResponse(false, "Email already registered."));

        var user = new AdminUser
        {
            Email = req.Email,
            FullName = req.FullName,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Role = req.Role,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _db.AdminUsers.Add(user);
        await _db.SaveChangesAsync();

        await LogActionAsync("CREATED_ADMIN_USER", "AdminUser", user.Id.ToString(),
            $"Created admin user: {user.Email}");

        return Ok(new AdminApiResponse(true, "Admin user created.", new
        {
            user.Id, user.Email, user.FullName, user.Role, user.IsActive, user.CreatedAt
        }));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var actorId = GetAdminId();
        if (id == 1)
            return BadRequest(new AdminApiResponse(false, "Cannot delete the default admin."));

        var actor = await _db.AdminUsers.FindAsync(actorId);
        if (actor?.Role != "SuperAdmin")
            return Forbid();

        var user = await _db.AdminUsers.FindAsync(id);
        if (user == null)
            return NotFound(new AdminApiResponse(false, "Admin user not found."));

        _db.AdminUsers.Remove(user);
        await _db.SaveChangesAsync();

        await LogActionAsync("DELETED_ADMIN_USER", "AdminUser", id.ToString(),
            $"Deleted admin user: {user.Email}");

        return Ok(new AdminApiResponse(true, "Admin user deleted."));
    }
}
