using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using StackExchange.Redis;
using KitaTolongKita.Core.Interfaces;

namespace KitaTolongKita.Api.Services;

/// <summary>
/// Provides the active AI config to moderation services.
/// Read order: memory cache (hot-reloaded from Redis pub/sub) → environment variables.
/// Cached for up to 1 hour; refreshed on Redis pub/sub event from admin API.
/// </summary>
public class AiConfigProvider : IAiConfigProvider
{
    private readonly IConfiguration _config;
    private readonly ILogger<AiConfigProvider> _logger;
    private readonly IMemoryCache _cache;

    private const string CacheKey = "ai:config:live";

    public AiConfigProvider(IConfiguration config, IMemoryCache cache, ILogger<AiConfigProvider> logger)
    {
        _config = config;
        _cache = cache;
        _logger = logger;
    }

    private string Get(string cacheKey, string envKey, string fallback)
    {
        if (_cache.TryGetValue(CacheKey, out var cached)
            && cached is Dictionary<string, string> dict
            && dict.TryGetValue(cacheKey, out var val)
            && !string.IsNullOrEmpty(val))
            return val;

        return _config[envKey] ?? fallback;
    }

    public string Provider => Get("provider", "AI:Provider", "azure-openai");
    public string ApiKey => Get("apiKey", "AI:ApiKey", "");
    public string BaseUrl => Get("baseUrl", "AI:BaseUrl", "");
    public string Model => Get("model", "AI:Model", "");
    public string Endpoint => Get("endpoint", "AI:Endpoint", "");
    public string DeploymentName => Get("deploymentName", "AI:DeploymentName", "");

    public int AutoApproveThreshold =>
        int.TryParse(Get("auto_approve_threshold", "AI:AutoApproveThreshold", "80"), out var a) ? a : 80;

    public int PendingReviewThreshold =>
        int.TryParse(Get("pending_review_threshold", "AI:PendingReviewThreshold", "50"), out var p) ? p : 50;

    /// <summary>
    /// Called by ConfigReloadService when admin updates AI config — hot-reloads credentials without restart.
    /// </summary>
    public void UpdateFromRedis(Dictionary<string, string> values)
    {
        _cache.Set(CacheKey, values, TimeSpan.FromHours(1));
        _logger.LogInformation("AI config hot-reloaded: provider={Provider}, baseUrl={BaseUrl}, model={Model}",
            values.GetValueOrDefault("provider"),
            values.GetValueOrDefault("baseUrl"),
            values.GetValueOrDefault("model"));
    }
}
