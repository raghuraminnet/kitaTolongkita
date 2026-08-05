using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Infrastructure.Data;

namespace KitaTolongKita.Api.Controllers.AdminArea;

[ApiController]
[Route("api/ai-configs")]
[Authorize(AuthenticationSchemes = "AdminJwt", Policy = "Moderator")]
public class AiConfigsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IDistributedCache _cache;
    private readonly ILogger<AiConfigsController> _logger;

    public AiConfigsController(AppDbContext db, IDistributedCache cache, ILogger<AiConfigsController> logger)
    {
        _db = db;
        _cache = cache;
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

    private static string MaskApiKey(string? key) =>
        string.IsNullOrWhiteSpace(key) || key.Length < 8
            ? "****" : $"{key[..4]}...{key[^4..]}";

    private static AiConfigItem ToItem(AiConfig c) => new(
        c.Id, c.Name, c.Provider, MaskApiKey(c.ApiKey),
        c.Endpoint, c.BaseUrl, c.DeploymentName, c.ModelName,
        c.IsActive, c.CreatedAt, c.UpdatedAt);

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var configs = await _db.AiConfigs
            .AsNoTracking().OrderBy(x => x.Name)
            .Select(c => ToItem(c))
            .ToListAsync();
        return Ok(new AdminApiResponse(true, null, configs));
    }

    [HttpGet("active")]
    public async Task<IActionResult> GetActive()
    {
        var config = await _db.AiConfigs.FirstOrDefaultAsync(x => x.IsActive);
        return Ok(new AdminApiResponse(true, null, config == null ? null : ToItem(config)));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAiConfigRequest req)
    {
        var existing = await _db.AiConfigs.AnyAsync(x => x.Name == req.Name);
        if (existing) return Conflict(new AdminApiResponse(false, "AI config with this name already exists."));

        var adminId = GetAdminId();
        var config = new AiConfig
        {
            Name = req.Name, Provider = req.Provider, ApiKey = req.ApiKey,
            Endpoint = req.Endpoint, BaseUrl = req.BaseUrl,
            DeploymentName = req.DeploymentName, ModelName = req.ModelName,
            IsActive = false, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
            CreatedByAdminId = adminId
        };
        _db.AiConfigs.Add(config);
        await _db.SaveChangesAsync();

        // Auto-activate if it's the first one
        var count = await _db.AiConfigs.CountAsync();
        if (count == 1) { config.IsActive = true; await _db.SaveChangesAsync(); }

        await LogActionAsync("CREATED_AI_CONFIG", "AiConfig", config.Id.ToString(),
            $"Created {config.Name} ({config.Provider})");

        return Ok(new AdminApiResponse(true, "AI config created.", ToItem(config)));
    }

    [HttpPatch("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateAiConfigRequest req)
    {
        var config = await _db.AiConfigs.FindAsync(id);
        if (config == null) return NotFound(new AdminApiResponse(false, "AI config not found."));

        if (req.Name != null) config.Name = req.Name;
        if (req.Provider != null) config.Provider = req.Provider;
        if (req.ApiKey != null) config.ApiKey = req.ApiKey;
        if (req.Endpoint != null) config.Endpoint = req.Endpoint;
        if (req.BaseUrl != null) config.BaseUrl = req.BaseUrl;
        if (req.DeploymentName != null) config.DeploymentName = req.DeploymentName;
        if (req.ModelName != null) config.ModelName = req.ModelName;

        if (req.IsActive == true)
        {
            var others = await _db.AiConfigs.Where(x => x.Id != id).ToListAsync();
            others.ForEach(x => x.IsActive = false);
        }
        if (req.IsActive.HasValue) config.IsActive = req.IsActive.Value;

        config.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await LogActionAsync("UPDATED_AI_CONFIG", "AiConfig", config.Id.ToString(),
            $"Updated {config.Name}");

        return Ok(new AdminApiResponse(true, "AI config updated.", ToItem(config)));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var config = await _db.AiConfigs.FindAsync(id);
        if (config == null) return NotFound(new AdminApiResponse(false, "AI config not found."));

        _db.AiConfigs.Remove(config);
        await _db.SaveChangesAsync();

        await LogActionAsync("DELETED_AI_CONFIG", "AiConfig", id.ToString(),
            $"Deleted {config.Name}");

        return Ok(new AdminApiResponse(true, "AI config deleted."));
    }
}
