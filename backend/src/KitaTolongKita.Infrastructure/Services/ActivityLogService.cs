using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using KitaTolongKita.Core.DTOs;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Core.Interfaces;
using KitaTolongKita.Infrastructure.Data;
using LogLevel = KitaTolongKita.Core.Entities.LogLevel;

namespace KitaTolongKita.Infrastructure.Services;

/// <summary>
/// Persistent activity-logger that stores entries in PostgreSQL via EF Core.
/// Fire-and-forget safe — all public methods swallow exceptions so logging
/// never disrupts the request pipeline.
/// </summary>
public class ActivityLogService : IActivityLogService
{
    private readonly AppDbContext _db;
    private readonly ILogger<ActivityLogService> _logger;

    public ActivityLogService(AppDbContext db, ILogger<ActivityLogService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task LogAsync(
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
        string? userAgent = null)
    {
        try
        {
            var entry = new ActivityLog
            {
                Level = level,
                Category = category,
                Action = action,
                Message = message,
                EntityType = entityType,
                EntityId = entityId,
                UserId = userId,
                UserEmail = userEmail,
                Metadata = metadata,
                IpAddress = ipAddress,
                UserAgent = userAgent,
                CreatedAt = DateTime.UtcNow
            };

            _db.ActivityLogs.Add(entry);
            await _db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            // Swallow — never let logging break the request
            _logger.LogWarning(ex,
                "Failed to persist activity log. Category={Category} Action={Action} Message={Message}",
                category, action, message);
        }
    }

    public async Task<PagedResult<ActivityLogDto>> GetLogsAsync(
        string? category = null,
        string? level = null,
        string? action = null,
        Guid? userId = null,
        DateTime? from = null,
        DateTime? to = null,
        int page = 1,
        int pageSize = 50)
    {
        var query = _db.ActivityLogs.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(category) &&
            Enum.TryParse<LogCategory>(category, true, out var cat))
            query = query.Where(l => l.Category == cat);

        if (!string.IsNullOrWhiteSpace(level) &&
            Enum.TryParse<LogLevel>(level, true, out var lvl))
            query = query.Where(l => l.Level == lvl);

        if (!string.IsNullOrWhiteSpace(action))
            query = query.Where(l => l.Action.Contains(action));

        if (userId.HasValue)
            query = query.Where(l => l.UserId == userId.Value);

        if (from.HasValue)
            query = query.Where(l => l.CreatedAt >= from.Value);

        if (to.HasValue)
            query = query.Where(l => l.CreatedAt <= to.Value);

        var total = await query.CountAsync();

        var items = await query
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(l => new ActivityLogDto
            {
                Id = l.Id,
                UserId = l.UserId,
                UserEmail = l.UserEmail,
                Category = l.Category.ToString(),
                Level = l.Level.ToString(),
                Action = l.Action,
                EntityType = l.EntityType,
                EntityId = l.EntityId,
                Message = l.Message,
                Metadata = l.Metadata,
                IpAddress = l.IpAddress,
                UserAgent = l.UserAgent,
                CreatedAt = l.CreatedAt
            })
            .ToListAsync();

        return new PagedResult<ActivityLogDto>(items, total, page, pageSize,
            (int)Math.Ceiling(total / (double)pageSize));
    }

    public async Task<LogStatsDto> GetStatsAsync(DateTime? since = null)
    {
        var baseQuery = _db.ActivityLogs.AsNoTracking().AsQueryable();

        if (since.HasValue)
            baseQuery = baseQuery.Where(l => l.CreatedAt >= since.Value);

        var all = baseQuery.ToList();

        return new LogStatsDto
        {
            Total = all.Count,
            Debug = all.Count(l => l.Level == LogLevel.Debug),
            Info = all.Count(l => l.Level == LogLevel.Info),
            Warning = all.Count(l => l.Level == LogLevel.Warning),
            Error = all.Count(l => l.Level == LogLevel.Error),
            Critical = all.Count(l => l.Level == LogLevel.Critical)
        };
    }
}
