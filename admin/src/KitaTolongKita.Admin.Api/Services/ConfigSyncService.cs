using System.Text.Json;
using StackExchange.Redis;

namespace KitaTolongKita.Admin.Api.Services;

public interface IConfigSyncService
{
    Task PublishConfigChangeAsync(string channel, object payload);
    Task SetConfigAsync(string key, string value);
    Task<Dictionary<string, string>> GetAllAppConfigAsync();
}

public class RedisConfigSyncService : IConfigSyncService
{
    private readonly IConnectionMultiplexer? _redis;
    private readonly ILogger<RedisConfigSyncService> _logger;
    private readonly IDatabase? _db;

    public RedisConfigSyncService(IConfiguration config, ILogger<RedisConfigSyncService> logger)
    {
        _logger = logger;
        var redisUrl = config["Redis:Url"] ?? "redis:6379";
        try
        {
            var opts = ConfigurationOptions.Parse(redisUrl);
            opts.AbortOnConnectFail = false;
            opts.ConnectTimeout = 5000;
            _redis = ConnectionMultiplexer.Connect(opts);
            _db = _redis.GetDatabase();
            _logger.LogInformation("Connected to Redis at {Url}", redisUrl);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis unavailable at {Url} — config sync disabled", redisUrl);
        }
    }

    public async Task PublishConfigChangeAsync(string channel, object payload)
    {
        if (_db == null) { _logger.LogWarning("Redis not connected — skipping publish to {Channel}", channel); return; }
        try
        {
            var json = JsonSerializer.Serialize(payload);
            await _db.PublishAsync(RedisChannel.Literal(channel), json);
            _logger.LogInformation("Published config change to {Channel}: {Payload}", channel, json);
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

    public async Task<Dictionary<string, string>> GetAllAppConfigAsync()
    {
        var result = new Dictionary<string, string>();
        if (_db == null) return result;
        try
        {
            var server = _redis?.GetServer(_redis.GetEndPoints().First());
            await foreach (var key in server!.KeysAsync(pattern: "app:config:*"))
            {
                var val = await _db.StringGetAsync(key);
                if (val.HasValue)
                    result[key.ToString().Replace("app:config:", "")] = val!;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get all app config from Redis");
        }
        return result;
    }
}
