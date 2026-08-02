using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;

namespace KitaTolongKita.Infrastructure.Services;

/// <summary>
/// Typed Redis cache wrapper using IDistributedCache.
/// All cache keys are prefixed and serialized/deserialized automatically.
/// </summary>
public interface ICacheService
{
    Task<T?> GetAsync<T>(string key, CancellationToken ct = default) where T : class;
    Task SetAsync<T>(string key, T value, TimeSpan? expiry = null, CancellationToken ct = default) where T : class;
    Task RemoveAsync(string key, CancellationToken ct = default);
    Task RemoveByPrefixAsync(string prefix, CancellationToken ct = default);
    Task<T> GetOrSetAsync<T>(string key, Func<Task<T>> factory, TimeSpan? expiry = null, CancellationToken ct = default) where T : class;
}

public class RedisCacheService : ICacheService
{
    private readonly IDistributedCache _cache;
    private readonly ILogger<RedisCacheService> _logger;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    // Redis key prefixes — used for invalidation by prefix
    public static class Keys
    {
        public const string DashboardStats = "stats:dashboard";
        public const string DealCountsByCategory = "stats:deals:by-category";
        public const string DealCountAll = "stats:deals:total";
        public const string SearchResults = "search:deals";
        public const string AiModerationResult = "ai:moderation";
        public const string CategoryList = "categories:list";
        public const string AppSettings = "settings:app";
    }

    public RedisCacheService(IDistributedCache cache, ILogger<RedisCacheService> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    public async Task<T?> GetAsync<T>(string key, CancellationToken ct = default) where T : class
    {
        try
        {
            var bytes = await _cache.GetAsync(key, ct);
            if (bytes == null) return null;
            return JsonSerializer.Deserialize<T>(bytes, JsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis GET failed for key {Key}", key);
            return null;
        }
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? expiry = null, CancellationToken ct = default) where T : class
    {
        try
        {
            var bytes = System.Text.Encoding.UTF8.GetBytes(JsonSerializer.Serialize(value, JsonOptions));
            var opts = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = expiry ?? TimeSpan.FromMinutes(10)
            };
            await _cache.SetAsync(key, bytes, opts, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis SET failed for key {Key}", key);
        }
    }

    public async Task RemoveAsync(string key, CancellationToken ct = default)
    {
        try { await _cache.RemoveAsync(key, ct); }
        catch (Exception ex) { _logger.LogWarning(ex, "Redis REMOVE failed for key {Key}", key); }
    }

    /// <summary>
    /// Invalidate all keys matching a prefix.
    /// Since IDistributedCache doesn't support SCAN natively, we track known keys
    /// in a Redis SET and delete them when invalidation is needed.
    /// For simplicity, this uses a known-key list stored at "cache:keys:{prefix}".
    /// </summary>
    public async Task RemoveByPrefixAsync(string prefix, CancellationToken ct = default)
    {
        try
        {
            var keySetKey = $"cache:keys:{prefix}";
            var bytes = await _cache.GetAsync(keySetKey, ct);
            if (bytes == null) return;

            var keys = JsonSerializer.Deserialize<List<string>>(bytes, JsonOptions) ?? [];
            foreach (var k in keys)
            {
                await _cache.RemoveAsync(k, ct);
            }
            await _cache.RemoveAsync(keySetKey, ct);
            _logger.LogInformation("Cache invalidated: {Prefix} ({Count} keys)", prefix, keys.Count);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis RemoveByPrefix failed for prefix {Prefix}", prefix);
        }
    }

    /// <summary>
    /// Get value from cache, or execute factory and cache the result if not present.
    /// Also tracks the key in a key-set for invalidation by prefix.
    /// </summary>
    public async Task<T> GetOrSetAsync<T>(string key, Func<Task<T>> factory, TimeSpan? expiry = null, CancellationToken ct = default) where T : class
    {
        var cached = await GetAsync<T>(key, ct);
        if (cached != null) return cached;

        var value = await factory();
        if (value != null)
        {
            await SetAsync(key, value, expiry, ct);
            await TrackKeyAsync(key, ct);
        }
        return value;
    }

    /// <summary>Track a cache key under its prefix set for later invalidation.</summary>
    private async Task TrackKeyAsync(string key, CancellationToken ct)
    {
        try
        {
            // Extract prefix from key (first colon segment)
            var colonIdx = key.IndexOf(':');
            var prefix = colonIdx > 0 ? key[..colonIdx] : key;
            var keySetKey = $"cache:keys:{prefix}";

            var bytes = await _cache.GetAsync(keySetKey, ct);
            var keys = bytes == null ? new List<string>() : JsonSerializer.Deserialize<List<string>>(bytes, JsonOptions) ?? [];
            if (!keys.Contains(key))
            {
                keys.Add(key);
                var opts = new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(24) };
                await _cache.SetAsync(keySetKey, System.Text.Encoding.UTF8.GetBytes(JsonSerializer.Serialize(keys, JsonOptions)), opts, ct);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to track cache key {Key}", key);
        }
    }
}
