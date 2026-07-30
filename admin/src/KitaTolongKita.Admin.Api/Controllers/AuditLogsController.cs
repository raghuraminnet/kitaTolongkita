using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KitaTolongKita.Admin.Api.Data;
using KitaTolongKita.Admin.Api.DTOs;

namespace KitaTolongKita.Admin.Api.Controllers;

[ApiController]
[Route("api/audit-logs")]
[Authorize(Policy = "Viewer")]
public class AuditLogsController : ControllerBase
{
    private readonly AdminDbContext _db;

    public AuditLogsController(AdminDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] string? action = null,
        [FromQuery] string? entityType = null,
        [FromQuery] string? adminEmail = null,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var q = _db.AuditLogs.AsQueryable();

        if (!string.IsNullOrEmpty(action))
            q = q.Where(x => x.Action.Contains(action));
        if (!string.IsNullOrEmpty(entityType))
            q = q.Where(x => x.EntityType == entityType);
        if (!string.IsNullOrEmpty(adminEmail))
            q = q.Where(x => x.AdminEmail.Contains(adminEmail));
        if (from.HasValue)
            q = q.Where(x => x.CreatedAt >= from.Value);
        if (to.HasValue)
            q = q.Where(x => x.CreatedAt <= to.Value);

        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(x => x.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var totalPages = (int)Math.Ceiling(total / (double)pageSize);
        return Ok(new PagedResult<AuditLogItem>(
            items.Select(x => new AuditLogItem(x.Action, x.EntityType, x.EntityId, x.AdminEmail, x.Details, x.CreatedAt)).ToList(),
            total, page, pageSize, totalPages
        ));
    }
}

public record AuditLogItem(string Action, string EntityType, int EntityId, string AdminEmail, string? Details, DateTime At);
