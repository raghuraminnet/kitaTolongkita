using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Core.Interfaces;

namespace KitaTolongKita.Infrastructure.Services;

/// <summary>
/// Publishes configuration and moderation rule updates to Redis so the runtime API
/// and background workers reload thresholds and AI parameters immediately.
/// </summary>
public class ConfigSyncService : IConfigSyncService
{
    private readonly IConnectionMultiplexer? _redis;
    private readonly ILogger<ConfigSyncService> _logger;
    private readonly IDatabase? _db;

    public ConfigSyncService(IConfiguration config, ILogger<ConfigSyncService> logger)
    {
        _logger = logger;
        var redisUrl = (config["Redis:Url"] ?? "redis:6379").Replace("redis://", "");
        try
        {
            var opts = ConfigurationOptions.Parse(redisUrl);
            opts.AbortOnConnectFail = false;
            opts.ConnectTimeout = 5000;
            _redis = ConnectionMultiplexer.Connect(opts);
            _db = _redis.GetDatabase();
            _logger.LogInformation("ConfigSyncService connected to Redis at {Url}", redisUrl);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis unavailable at {Url} — live config sync via pub/sub will be disabled", redisUrl);
        }
    }

    public async Task PublishConfigChangeAsync(string channel, object payload)
    {
        if (_db == null)
        {
            _logger.LogWarning("Redis not connected — skipping publish to channel {Channel}", channel);
            return;
        }

        try
        {
            var json = JsonSerializer.Serialize(payload);
            await _db.PublishAsync(RedisChannel.Literal(channel), json);
            _logger.LogInformation("Published config change to channel {Channel}: {Payload}", channel, json);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish to Redis channel {Channel}", channel);
        }
    }

    public async Task SetConfigAsync(string key, string value)
    {
        if (_db == null) return;
        try
        {
            await _db.StringSetAsync($"app:config:{key}", value);
            await PublishConfigChangeAsync("config:changed", new { key, value });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to set Redis key {Key}", key);
        }
    }

    public async Task PublishAiConfigAsync(AiConfig config)
    {
        if (_db == null)
        {
            _logger.LogWarning("Redis not connected — skipping AI config sync");
            return;
        }

        try
        {
            var configData = new Dictionary<string, string>
            {
                ["provider"] = config.Provider ?? "",
                ["apiKey"] = config.ApiKey ?? "",
                ["baseUrl"] = config.BaseUrl ?? "",
                ["model"] = config.ModelName ?? "",
                ["endpoint"] = config.Endpoint ?? "",
                ["deploymentName"] = config.DeploymentName ?? ""
            };

            var json = JsonSerializer.Serialize(configData);
            await _db.StringSetAsync("ai:config:live", json, TimeSpan.FromDays(7));
            await PublishConfigChangeAsync("config:changed", new { key = "ai:config:live", value = json });
            _logger.LogInformation("Synced active AI config to Redis: {Provider} / {Model}", config.Provider, config.ModelName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish AI config to Redis");
        }
    }

    public async Task PublishModerationRulesAsync(Dictionary<string, string> rules)
    {
        if (_db == null) return;
        try
        {
            var json = JsonSerializer.Serialize(rules);
            await _db.StringSetAsync("moderation:rules:live", json, TimeSpan.FromDays(7));
            await PublishConfigChangeAsync("moderation:rules:updated", rules);
            _logger.LogInformation("Synced moderation rules to Redis: {Count} rules", rules.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish moderation rules to Redis");
        }
    }
}
