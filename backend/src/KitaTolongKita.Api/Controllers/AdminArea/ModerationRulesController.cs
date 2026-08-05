using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Infrastructure.Data;

namespace KitaTolongKita.Api.Controllers.AdminArea;

[ApiController]
[Route("api/moderation-rules")]
[Authorize(AuthenticationSchemes = "AdminJwt", Policy = "Moderator")]
public class ModerationRulesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<ModerationRulesController> _logger;

    public ModerationRulesController(AppDbContext db, ILogger<ModerationRulesController> logger)
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
    public async Task<IActionResult> GetAll([FromQuery] string? category = null)
    {
        var q = _db.ModerationRules.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(category))
            q = q.Where(r => r.Category == category);

        var rules = await q
            .OrderBy(r => r.Category).ThenBy(r => r.Key)
            .Select(r => new ModerationRuleItem(
                r.Id, r.Key, r.Value, r.Description, r.Category, r.IsActive, r.UpdatedAt))
            .ToListAsync();

        return Ok(new AdminApiResponse(true, null, rules));
    }

    [HttpPatch("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateModerationRuleRequest req)
    {
        var rule = await _db.ModerationRules.FindAsync(id);
        if (rule == null) return NotFound(new AdminApiResponse(false, "Rule not found."));

        if (req.Value != null) rule.Value = req.Value;
        if (req.IsActive.HasValue) rule.IsActive = req.IsActive.Value;
        rule.UpdatedAt = DateTime.UtcNow;
        rule.UpdatedByAdminId = GetAdminId();
        await _db.SaveChangesAsync();

        await LogActionAsync("UPDATED_MODERATION_RULE", "ModerationRule", rule.Id.ToString(),
            $"{rule.Key} = {rule.Value} (active={rule.IsActive})");

        return Ok(new AdminApiResponse(true, "Rule updated.", new ModerationRuleItem(
            rule.Id, rule.Key, rule.Value, rule.Description, rule.Category, rule.IsActive, rule.UpdatedAt)));
    }
}
