using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Core.Interfaces;
using KitaTolongKita.Infrastructure.Data;

namespace KitaTolongKita.Infrastructure.Services;

public interface ICommentService
{
    Task<DealComment?> CreateCommentAsync(Guid dealId, Guid userId, string content);
    Task<bool> DeleteCommentAsync(Guid commentId, Guid userId);
    Task<List<CommentItem>> GetCommentsAsync(Guid dealId, int page, int pageSize);
    Task<int> GetCommentCountAsync(Guid dealId);
}

public record CommentItem(
    Guid Id,
    Guid UserId,
    string UserFullName,
    string? UserAvatarUrl,
    string Content,
    DateTime CreatedAt,
    bool IsHidden,
    string ModerationStatus
);

public class CommentService : ICommentService
{
    private readonly AppDbContext _db;
    private readonly IDistributedCache _cache;
    private readonly IElasticsearchService _es;
    private readonly IModerationService? _moderation;
    private readonly ILogger<CommentService> _logger;
    private const int MaxCommentLength = 500;

    public CommentService(
        AppDbContext db,
        IDistributedCache cache,
        IElasticsearchService es,
        IEnumerable<IModerationService> moderations,
        ILogger<CommentService> logger)
    {
        _db = db;
        _cache = cache;
        _es = es;
        _moderation = moderations.FirstOrDefault(); // Use the configured AI moderation
        _logger = logger;
    }

    public async Task<DealComment?> CreateCommentAsync(Guid dealId, Guid userId, string content)
    {
        // Enforce max length
        if (string.IsNullOrWhiteSpace(content) || content.Length > MaxCommentLength)
            return null;

        var deal = await _db.Deals.FindAsync(dealId);
        if (deal == null) return null;

        var comment = new DealComment
        {
            DealId = dealId,
            UserId = userId,
            Content = content.Trim(),
            ModerationStatus = "Approved",
            IsHidden = false
        };

        // Note: comment moderation can be added here when IModerationService gains text analysis support

        _db.DealComments.Add(comment);
        await _db.SaveChangesAsync();

        // Update ES comment_count (fire-and-forget, don't block response)
        _ = UpdateEsCommentCountAsync(dealId);

        // Invalidate comment cache
        await InvalidateCommentCacheAsync(dealId);

        return comment;
    }

    public async Task<bool> DeleteCommentAsync(Guid commentId, Guid userId)
    {
        var comment = await _db.DealComments.FindAsync(commentId);
        if (comment == null || comment.UserId != userId) return false;

        var dealId = comment.DealId;
        _db.DealComments.Remove(comment);
        await _db.SaveChangesAsync();

        _ = UpdateEsCommentCountAsync(dealId);
        await InvalidateCommentCacheAsync(dealId);

        return true;
    }

    public async Task<List<CommentItem>> GetCommentsAsync(Guid dealId, int page, int pageSize)
    {
        var cacheKey = $"deal:comments:{dealId}:{page}:{pageSize}";
        try
        {
            var cached = await _cache.GetStringAsync(cacheKey);
            if (cached != null)
            {
                return JsonSerializer.Deserialize<List<CommentItem>>(cached) ?? [];
            }
        }
        catch { /* cache miss */ }

        var comments = await _db.DealComments
            .AsNoTracking()
            .Where(c => c.DealId == dealId && !c.IsHidden && c.ModerationStatus == "Approved")
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Join(_db.Users, c => c.UserId, u => u.Id, (c, u) =>
                new CommentItem(c.Id, c.UserId, u.FullName, u.AvatarUrl, c.Content, c.CreatedAt, c.IsHidden, c.ModerationStatus))
            .ToListAsync();

        try
        {
            await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(comments),
                new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(1) });
        }
        catch { /* ignore */ }

        return comments;
    }

    public async Task<int> GetCommentCountAsync(Guid dealId)
    {
        var cacheKey = $"deal:comment_count:{dealId}";
        try
        {
            var cached = await _cache.GetStringAsync(cacheKey);
            if (cached != null) return int.Parse(cached);
        }
        catch { /* cache miss */ }

        var count = await _db.DealComments
            .CountAsync(c => c.DealId == dealId && !c.IsHidden && c.ModerationStatus == "Approved");

        try
        {
            await _cache.SetStringAsync(cacheKey, count.ToString(),
                new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(2) });
        }
        catch { /* ignore */ }

        return count;
    }

    private async Task UpdateEsCommentCountAsync(Guid dealId)
    {
        try
        {
            var count = await _db.DealComments
                .CountAsync(c => c.DealId == dealId && !c.IsHidden && c.ModerationStatus == "Approved");
            // ES sync via the existing deal refresh mechanism
            await _es.RefreshDealIndexAsync(dealId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to update ES comment count for deal {DealId}", dealId);
        }
    }

    private async Task InvalidateCommentCacheAsync(Guid dealId)
    {
        try
        {
            // Simple approach: remove known cache key patterns
            await _cache.RemoveAsync($"deal:comment_count:{dealId}");
            // Paginated comment pages — remove first 10 pages
            for (var p = 1; p <= 10; p++)
            {
                await _cache.RemoveAsync($"deal:comments:{dealId}:{p}:20");
            }
        }
        catch { /* ignore */ }
    }
}
