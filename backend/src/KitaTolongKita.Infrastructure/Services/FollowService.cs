using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Infrastructure.Data;

namespace KitaTolongKita.Infrastructure.Services;

public interface IFollowService
{
    Task<bool> FollowAsync(Guid followerId, Guid followingId);
    Task<bool> UnfollowAsync(Guid followerId, Guid followingId);
    Task<bool> IsFollowingAsync(Guid followerId, Guid followingId);
    Task<(int followers, int following)> GetCountsAsync(Guid userId);
    Task<List<UserFollowItem>> GetFollowersAsync(Guid userId, int page, int pageSize);
    Task<List<UserFollowItem>> GetFollowingAsync(Guid userId, int page, int pageSize);
}

public record UserFollowItem(
    Guid UserId,
    string FullName,
    string? AvatarUrl,
    DateTime FollowedAt
);

public class FollowService : IFollowService
{
    private readonly AppDbContext _db;
    private readonly IDistributedCache _cache;
    private readonly ILogger<FollowService> _logger;

    private const string CountKeyFmt = "follow:counts:{0}";
    private static readonly TimeSpan CountCacheDuration = TimeSpan.FromMinutes(5);

    public FollowService(AppDbContext db, IDistributedCache cache, ILogger<FollowService> logger)
    {
        _db = db;
        _cache = cache;
        _logger = logger;
    }

    public async Task<bool> FollowAsync(Guid followerId, Guid followingId)
    {
        if (followerId == followingId) return false;

        var existing = await _db.UserFollows
            .FirstOrDefaultAsync(f => f.FollowerId == followerId && f.FollowingId == followingId);

        if (existing != null) return false; // already following

        var follow = new UserFollow { FollowerId = followerId, FollowingId = followingId };
        _db.UserFollows.Add(follow);
        await _db.SaveChangesAsync();

        await InvalidateCountCacheAsync(followerId);
        await InvalidateCountCacheAsync(followingId);

        return true;
    }

    public async Task<bool> UnfollowAsync(Guid followerId, Guid followingId)
    {
        var follow = await _db.UserFollows
            .FirstOrDefaultAsync(f => f.FollowerId == followerId && f.FollowingId == followingId);

        if (follow == null) return false;

        _db.UserFollows.Remove(follow);
        await _db.SaveChangesAsync();

        await InvalidateCountCacheAsync(followerId);
        await InvalidateCountCacheAsync(followingId);

        return true;
    }

    public async Task<bool> IsFollowingAsync(Guid followerId, Guid followingId)
    {
        var cacheKey = $"follow:status:{followerId}:{followingId}";
        try
        {
            var cached = await _cache.GetStringAsync(cacheKey);
            if (cached != null) return JsonSerializer.Deserialize<bool>(cached);
        }
        catch { /* cache miss */ }

        var exists = await _db.UserFollows
            .AnyAsync(f => f.FollowerId == followerId && f.FollowingId == followingId);

        try
        {
            await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(exists),
                new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5) });
        }
        catch { /* ignore */ }

        return exists;
    }

    public async Task<(int followers, int following)> GetCountsAsync(Guid userId)
    {
        var cacheKey = string.Format(CountKeyFmt, userId);
        try
        {
            var cached = await _cache.GetStringAsync(cacheKey);
            if (cached != null)
            {
                var parts = JsonSerializer.Deserialize<int[]>(cached);
                if (parts?.Length == 2) return (parts[0], parts[1]);
            }
        }
        catch { /* cache miss */ }

        var followerCount = await _db.UserFollows.CountAsync(f => f.FollowingId == userId);
        var followingCount = await _db.UserFollows.CountAsync(f => f.FollowerId == userId);

        try
        {
            await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize([followerCount, followingCount]),
                new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = CountCacheDuration });
        }
        catch { /* ignore */ }

        return (followerCount, followingCount);
    }

    public async Task<List<UserFollowItem>> GetFollowersAsync(Guid userId, int page, int pageSize)
    {
        return await _db.UserFollows
            .AsNoTracking()
            .Where(f => f.FollowingId == userId)
            .OrderByDescending(f => f.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Join(_db.Users, uf => uf.FollowerId, u => u.Id, (uf, u) =>
                new UserFollowItem(u.Id, u.FullName, u.AvatarUrl, uf.CreatedAt))
            .ToListAsync();
    }

    public async Task<List<UserFollowItem>> GetFollowingAsync(Guid userId, int page, int pageSize)
    {
        return await _db.UserFollows
            .AsNoTracking()
            .Where(f => f.FollowerId == userId)
            .OrderByDescending(f => f.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Join(_db.Users, uf => uf.FollowingId, u => u.Id, (uf, u) =>
                new UserFollowItem(u.Id, u.FullName, u.AvatarUrl, uf.CreatedAt))
            .ToListAsync();
    }

    private async Task InvalidateCountCacheAsync(Guid userId)
    {
        try { await _cache.RemoveAsync(string.Format(CountKeyFmt, userId)); }
        catch { /* ignore */ }
    }
}
