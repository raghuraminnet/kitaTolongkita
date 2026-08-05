using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Infrastructure.Data;

namespace KitaTolongKita.Api.Controllers.AdminArea;

[ApiController]
[Route("api/settings")]
[Authorize(AuthenticationSchemes = "AdminJwt", Policy = "Moderator")]
public class SettingsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<SettingsController> _logger;

    public SettingsController(AppDbContext db, ILogger<SettingsController> logger)
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
            AdminUserId = adminId, AdminEmail = admin?.Email ?? "unknown",
            Action = action, EntityType = entityType, EntityId = entityId,
            Details = details, CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var settings = await _db.AppSettings
            .AsNoTracking().OrderBy(x => x.Key)
            .Select(x => new SettingItem(x.Key, x.Value, x.Description))
            .ToListAsync();
        return Ok(new AdminApiResponse(true, null, settings));
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] UpdateSettingRequest req)
    {
        var setting = await _db.AppSettings.FirstOrDefaultAsync(x => x.Key == req.Key);
        if (setting == null)
            return NotFound(new AdminApiResponse(false, $"Setting '{req.Key}' not found."));

        setting.Value = req.Value;
        setting.UpdatedAt = DateTime.UtcNow;
        setting.UpdatedByAdminId = GetAdminId();
        await _db.SaveChangesAsync();

        await LogActionAsync("UPDATED_SETTING", "Setting", req.Key, $"{req.Key} = {req.Value}");

        return Ok(new AdminApiResponse(true, "Setting updated.", new SettingItem(setting.Key, setting.Value, setting.Description)));
    }
}
