using KitaTolongKita.Core.Entities;

namespace KitaTolongKita.Core.Interfaces;

/// <summary>
/// Centralised service for capturing structured activity / audit logs
/// across all Kita API services.
/// </summary>
public interface IActivityLogService
{
    /// <summary>
    /// Persist a log entry. Fire-and-forget safe — failures are swallowed
    /// so logging never breaks the request pipeline.
    /// </summary>
    Task LogAsync(
        LogLevel level,
        LogCategory category,
        string action,
        string message,
        string? entityType = null,
        Guid? entityId = null,
        Guid? userId = null,
        string? userEmail = null,
        string? metadata = null,
        string? ipAddress = null,
        string? userAgent = null);

    /// <summary>
    /// Query logs with optional filters and pagination.
    /// </summary>
    Task<PagedResult<ActivityLogDto>> GetLogsAsync(
        string? category = null,
        string? level = null,
        string? action = null,
        Guid? userId = null,
        DateTime? from = null,
        DateTime? to = null,
        int page = 1,
        int pageSize = 50);

    /// <summary>
    /// Summary counts per level — used for dashboard badges.
    /// </summary>
    Task<LogStatsDto> GetStatsAsync(DateTime? since = null);
}

/// <summary>Flattened DTO returned by the audit-logs endpoint.</summary>
public class ActivityLogDto
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public string? UserEmail { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Level { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string? EntityType { get; set; }
    public Guid? EntityId { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? Metadata { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class LogStatsDto
{
    public int Total { get; set; }
    public int Debug { get; set; }
    public int Info { get; set; }
    public int Warning { get; set; }
    public int Error { get; set; }
    public int Critical { get; set; }
}

/// <summary>Generic paginated result wrapper.</summary>
public class PagedResult<T>
{
    public IEnumerable<T> Items { get; set; } = Enumerable.Empty<T>();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);

    public PagedResult() { }
    public PagedResult(IEnumerable<T> items, int total, int page, int pageSize)
    {
        Items = items;
        TotalCount = total;
        Page = page;
        PageSize = pageSize;
    }
}
