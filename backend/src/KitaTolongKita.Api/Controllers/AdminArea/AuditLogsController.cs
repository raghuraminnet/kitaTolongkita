using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KitaTolongKita.Infrastructure.Data;

namespace KitaTolongKita.Api.Controllers.AdminArea;

[ApiController]
[Route("api/audit-logs")]
[Authorize(AuthenticationSchemes = "AdminJwt", Policy = "Moderator")]
public class AuditLogsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AuditLogsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? action = null,
        [FromQuery] string? entityType = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var q = _db.AuditLogs.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(action))
            q = q.Where(l => l.Action.Contains(action));
        if (!string.IsNullOrWhiteSpace(entityType))
            q = q.Where(l => l.EntityType == entityType);

        var total = await q.CountAsync();
        var logs = await q
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(l => new AuditLogItem(
                l.Id, l.AdminUserId, l.AdminEmail, l.Action,
                l.EntityType, l.EntityId, l.Details, l.CreatedAt))
            .ToListAsync();

        return Ok(new PagedResult<AuditLogItem>(logs, total, page, pageSize,
            (int)Math.Ceiling(total / (double)pageSize)));
    }
}
