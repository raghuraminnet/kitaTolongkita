using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using StackExchange.Redis;

namespace KitaTolongKita.Api.Services;

/// <summary>
/// Background service that subscribes to Redis config change events from the admin API
/// and updates the in-memory configuration cache so the app API picks up changes immediately.
/// </summary>
public class ConfigReloadService : BackgroundService
{
    private readonly ILogger<ConfigReloadService> _logger;
    private readonly IConnectionMultiplexer? _redis;
    private readonly IMemoryCache? _cache;

    public ConfigReloadService(IConfiguration config, ILogger<ConfigReloadService> logger, IMemoryCache? cache = null)
    {
        _logger = logger;
        _cache = cache;
        var redisUrl = config["Redis:Url"] ?? "redis://redis:6379";
        try
        {
            var opts = ConfigurationOptions.Parse(redisUrl);
            opts.AbortOnConnectFail = false;
            opts.ConnectTimeout = 5000;
            _redis = ConnectionMultiplexer.Connect(opts);
            _logger.LogInformation("ConfigReloadService connected to Redis at {Url}", redisUrl);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis unavailable at {Url} — config reload via pub/sub disabled", redisUrl);
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (_redis == null) return;

        try
        {
            var sub = _redis.GetSubscriber();

            // General config changes
            await sub.SubscribeAsync(RedisChannel.Literal("config:changed"), (ch, msg) =>
            {
                try
                {
                    var payload = JsonSerializer.Deserialize<ConfigChangePayload>(msg!);
                    if (payload == null) return;

                    // If it's an AI config update, parse and update AiConfigProvider
                    if (payload.key == "ai:config:live" && !string.IsNullOrEmpty(payload.value))
                    {
                        var dict = JsonSerializer.Deserialize<Dictionary<string, string>>(payload.value);
                        if (dict != null && _cache != null)
                        {
                            _cache.Set("ai:config:live", dict, TimeSpan.FromHours(1));
                            _logger.LogInformation("AI config hot-reloaded from Redis: provider={Provider}, baseUrl={BaseUrl}",
                                dict.GetValueOrDefault("provider"), dict.GetValueOrDefault("baseUrl"));
                            AiConfigHotReloadEvent?.Set();
                        }
                        return;
                    }

                    _logger.LogInformation("Config change received from admin: {Key} = {Value}", payload.key, payload.value);

                    // Invalidate/update cache
                    if (_cache != null)
                    {
                        var entry = _cache.CreateEntry($"config:{payload.key}");
                        entry.Value = payload.value;
                        entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1);
                        entry.Dispose();
                    }

                    // Signal controllers to reload config
                    ConfigChangedEvent?.Set();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to process config change: {Msg}", msg);
                }
            });

            _logger.LogInformation("Subscribed to Redis config:changed and ai:config:updated channels");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to subscribe to Redis config channel");
        }

        await Task.Delay(Timeout.Infinite, stoppingToken);
    }

    public static readonly AutoResetEvent ConfigChangedEvent = new(false);
    public static readonly AutoResetEvent AiConfigHotReloadEvent = new(false);
}

public class ConfigChangePayload
{
    public string key { get; set; } = "";
    public string value { get; set; } = "";
}
