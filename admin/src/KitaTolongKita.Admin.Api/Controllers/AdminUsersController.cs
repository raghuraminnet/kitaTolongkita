using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KitaTolongKita.Admin.Api.Data;
using KitaTolongKita.Admin.Api.DTOs;
using KitaTolongKita.Admin.Api.Entities;
using KitaTolongKita.Admin.Api.Services;

namespace KitaTolongKita.Admin.Api.Controllers;

[ApiController]
[Route("api/admin-users")]
[Authorize(Policy = "SuperAdmin")]
public class AdminUsersController : ControllerBase
{
    private readonly AdminDbContext _db;

    public AdminUsersController(AdminDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var users = await _db.AdminUsers
            .OrderBy(x => x.CreatedAt)
            .Select(x => new { x.Id, x.Email, x.FullName, x.Role, x.IsActive, x.CreatedAt, x.LastLoginAt })
            .ToListAsync();
        return Ok(new ApiResponse(true, null, users));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAdminUserRequest req)
    {
        if (await _db.AdminUsers.AnyAsync(x => x.Email == req.Email))
            return BadRequest(new ApiResponse(false, "Email already exists"));

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

        return Ok(new ApiResponse(true, "Admin user created", new { user.Id, user.Email, user.FullName, user.Role }));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (id == 1) return BadRequest(new ApiResponse(false, "Cannot delete super admin"));
        var user = await _db.AdminUsers.FindAsync(id);
        if (user == null) return NotFound();
        _db.AdminUsers.Remove(user);
        await _db.SaveChangesAsync();
        return Ok(new ApiResponse(true, "Admin user deleted"));
    }
}

public record CreateAdminUserRequest(string Email, string Password, string FullName, string Role = "Viewer");
