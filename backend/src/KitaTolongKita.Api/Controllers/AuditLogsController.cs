using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitaTolongKita.Core.Interfaces;

namespace KitaTolongKita.Api.Controllers;

/// <summary>
/// Read-only audit-log API consumed by the Admin Portal.
/// All endpoints require admin authentication.
/// </summary>
[ApiController]
[Route("api/audit-logs")]
[Authorize(AuthenticationSchemes = "InternalApiKey")]
public class AuditLogsController : ControllerBase
{
    private readonly IActivityLogService _logService;

    public AuditLogsController(IActivityLogService logService)
    {
        _logService = logService;
    }

    /// <summary>
    /// Paginated list of activity logs with optional filters.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetLogs(
        [FromQuery] string? category = null,
        [FromQuery] string? level = null,
        [FromQuery] string? action = null,
        [FromQuery(Name = "userId")] Guid? userId = null,
        [FromQuery] string? from = null,
        [FromQuery] string? to = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 200) pageSize = 50;

        DateTime? fromDate = null;
        DateTime? toDate = null;

        if (!string.IsNullOrEmpty(from) && DateTime.TryParse(from, out var f))
            fromDate = f.ToUniversalTime();
        if (!string.IsNullOrEmpty(to) && DateTime.TryParse(to, out var t))
            toDate = t.ToUniversalTime();

        var result = await _logService.GetLogsAsync(
            category, level, action, userId,
            fromDate, toDate, page, pageSize);

        return Ok(result);
    }

    /// <summary>
    /// Log-level summary counts — used for dashboard badges.
    /// </summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats([FromQuery] string? since = null)
    {
        DateTime? sinceDate = null;
        if (!string.IsNullOrEmpty(since) && DateTime.TryParse(since, out var s))
            sinceDate = s.ToUniversalTime();

        var stats = await _logService.GetStatsAsync(sinceDate);
        return Ok(stats);
    }

    /// <summary>
    /// Export filtered logs as CSV for compliance / review.
    /// </summary>
    [HttpGet("export")]
    public async Task<IActionResult> ExportCsv(
        [FromQuery] string? category = null,
        [FromQuery] string? level = null,
        [FromQuery] string? action = null,
        [FromQuery(Name = "userId")] Guid? userId = null,
        [FromQuery] string? from = null,
        [FromQuery] string? to = null)
    {
        DateTime? fromDate = null;
        DateTime? toDate = null;

        if (!string.IsNullOrEmpty(from) && DateTime.TryParse(from, out var f))
            fromDate = f.ToUniversalTime();
        if (!string.IsNullOrEmpty(to) && DateTime.TryParse(to, out var t))
            toDate = t.ToUniversalTime();

        var result = await _logService.GetLogsAsync(
            category, level, action, userId,
            fromDate, toDate, 1, 10000);

        var sb = new StringBuilder();
        sb.AppendLine("Id,UserId,UserEmail,Category,Level,Action,EntityType,EntityId,Message,IpAddress,CreatedAt");

        foreach (var log in result.Items)
        {
            sb.AppendLine(
                $"{log.Id}," +
                $"{log.UserId}," +
                $"{EscapeCsv(log.UserEmail)}," +
                $"{log.Category}," +
                $"{log.Level}," +
                $"{EscapeCsv(log.Action)}," +
                $"{EscapeCsv(log.EntityType)}," +
                $"{log.EntityId}," +
                $"{EscapeCsv(log.Message)}," +
                $"{EscapeCsv(log.IpAddress)}," +
                $"{log.CreatedAt:yyyy-MM-ddTHH:mm:ssZ}");
        }

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        return File(bytes, "text/csv", $"audit-logs-{DateTime.UtcNow:yyyyMMdd-HHmmss}.csv");
    }

    private static string EscapeCsv(string? value)
    {
        if (string.IsNullOrEmpty(value)) return "";
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
            return $"\"{value.Replace("\"", "\"\"")}\"";
        return value;
    }
}
