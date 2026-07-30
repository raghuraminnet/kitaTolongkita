using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitaTolongKita.Admin.Api.DTOs;
using KitaTolongKita.Admin.Api.Services;

namespace KitaTolongKita.Admin.Api.Controllers;

[ApiController]
[Route("api/admin-users")]
[Authorize(Policy = "SuperAdmin")]
public class AdminUsersController : ControllerBase
{
    private readonly IAdminService _svc;

    public AdminUsersController(IAdminService svc) => _svc = svc;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var users = await _svc.GetAdminUsersAsync();
        return Ok(new ApiResponse(true, null, users));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAdminUserRequest req)
    {
        try
        {
            var user = await _svc.CreateAdminUserAsync(req.Email, req.Password, req.FullName, req.Role);
            return Ok(new ApiResponse(true, "Admin user created.", new
            {
                user.Id, user.Email, user.FullName, user.Role, user.IsActive, user.CreatedAt
            }));
        }
        catch (Exception ex)
        {
            return BadRequest(new ApiResponse(false, $"Failed to create user: {ex.Message}"));
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var actorId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var ok = await _svc.DeleteAdminUserAsync(id, actorId);
        if (!ok) return BadRequest(new ApiResponse(false, "Cannot delete this admin user."));
        return Ok(new ApiResponse(true, "Admin user deleted."));
    }
}
