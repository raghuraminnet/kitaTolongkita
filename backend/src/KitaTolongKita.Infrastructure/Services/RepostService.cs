using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Infrastructure.Data;

namespace KitaTolongKita.Infrastructure.Services;

public interface IRepostService
{
    Task<bool> RepostAsync(Guid dealId, Guid userId);
    Task<bool> UnrepostAsync(Guid dealId, Guid userId);
    Task<bool> HasRepostedAsync(Guid dealId, Guid userId);
    Task<int> GetRepostCountAsync(Guid dealId);
    Task<List<RepostItem>> GetUserRepostsAsync(Guid userId, int page, int pageSize);
}

public record RepostItem(
    Guid RepostId,
    Guid DealId,
    string DealTitle,
    string? DealImageUrl,
    string Category,
    string OrganizerName,
    Guid OrganizerId,
    DateTime RepostedAt
);

public class RepostService : IRepostService
{
    private readonly AppDbContext _db;
    private readonly IDistributedCache _cache;
    private readonly IElasticsearchService _es;
    private readonly ILogger<RepostService> _logger;

    public RepostService(AppDbContext db, IDistributedCache cache, IElasticsearchService es, ILogger<RepostService> logger)
    {
        _db = db;
        _cache = cache;
        _es = es;
        _logger = logger;
    }

    public async Task<bool> RepostAsync(Guid dealId, Guid userId)
    {
        var deal = await _db.Deals.FindAsync(dealId);
        if (deal == null) return false;

        var existing = await _db.DealReposts
            .FirstOrDefaultAsync(r => r.DealId == dealId && r.UserId == userId);
        if (existing != null) return false; // already reposted

        var repost = new DealRepost { DealId = dealId, UserId = userId };
        _db.DealReposts.Add(repost);
        await _db.SaveChangesAsync();

        _ = UpdateEsRepostCountAsync(dealId);
        await InvalidateRepostCacheAsync(userId, dealId);

        return true;
    }

    public async Task<bool> UnrepostAsync(Guid dealId, Guid userId)
    {
        var repost = await _db.DealReposts
            .FirstOrDefaultAsync(r => r.DealId == dealId && r.UserId == userId);
        if (repost == null) return false;

        _db.DealReposts.Remove(repost);
        await _db.SaveChangesAsync();

        _ = UpdateEsRepostCountAsync(dealId);
        await InvalidateRepostCacheAsync(userId, dealId);

        return true;
    }

    public async Task<bool> HasRepostedAsync(Guid dealId, Guid userId)
    {
        var cacheKey = $"repost:status:{userId}:{dealId}";
        try
        {
            var cached = await _cache.GetStringAsync(cacheKey);
            if (cached != null) return JsonSerializer.Deserialize<bool>(cached);
        }
        catch { /* cache miss */ }

        var exists = await _db.DealReposts.AnyAsync(r => r.DealId == dealId && r.UserId == userId);
        try
        {
            await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(exists),
                new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5) });
        }
        catch { /* ignore */ }
        return exists;
    }

    public async Task<int> GetRepostCountAsync(Guid dealId)
    {
        var cacheKey = $"deal:repost_count:{dealId}";
        try
        {
            var cached = await _cache.GetStringAsync(cacheKey);
            if (cached != null) return int.Parse(cached);
        }
        catch { /* cache miss */ }

        var count = await _db.DealReposts.CountAsync(r => r.DealId == dealId);
        try
        {
            await _cache.SetStringAsync(cacheKey, count.ToString(),
                new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(2) });
        }
        catch { /* ignore */ }
        return count;
    }

    public async Task<List<RepostItem>> GetUserRepostsAsync(Guid userId, int page, int pageSize)
    {
        var cacheKey = $"user:reposts:{userId}:{page}:{pageSize}";
        try
        {
            var cached = await _cache.GetStringAsync(cacheKey);
            if (cached != null)
                return JsonSerializer.Deserialize<List<RepostItem>>(cached) ?? [];
        }
        catch { /* cache miss */ }

        var reposts = await _db.DealReposts
            .AsNoTracking()
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Join(_db.Deals, rp => rp.DealId, d => d.Id, (rp, d) => new { rp, d })
            .Join(_db.Users, x => x.d.OrganizerId, u => u.Id, (x, u) =>
                new RepostItem(
                    x.rp.Id, x.d.Id, x.d.Title, x.d.ImageUrl ?? x.d.ImageUrls.FirstOrDefault(),
                    x.d.Category, u.FullName, u.Id, x.rp.CreatedAt))
            .ToListAsync();

        try
        {
            await _cache.SetStringAsync(cacheKey, JsonSerializer.SerializeToUtf8(reposts),
                new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(1) });
        }
        catch { /* ignore */ }

        return reposts;
    }

    private async Task UpdateEsRepostCountAsync(Guid dealId)
    {
        try
        {
            await _es.RefreshDealIndexAsync(dealId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to refresh ES repost count for deal {DealId}", dealId);
        }
    }

    private async Task InvalidateRepostCacheAsync(Guid userId, Guid dealId)
    {
        try
        {
            await _cache.RemoveAsync($"deal:repost_count:{dealId}");
            await _cache.RemoveAsync($"repost:status:{userId}:{dealId}");
            // Invalidate user's repost list pages
            for (var p = 1; p <= 5; p++)
                await _cache.RemoveAsync($"user:reposts:{userId}:{p}:20");
        }
        catch { /* ignore */ }
    }
}
