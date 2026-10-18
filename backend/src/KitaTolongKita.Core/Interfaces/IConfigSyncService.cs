using KitaTolongKita.Core.Entities;

namespace KitaTolongKita.Core.Interfaces;

/// <summary>
/// Synchronizes configuration updates between the administration portal and runtime services
/// via Redis pub/sub and distributed caching.
/// </summary>
public interface IConfigSyncService
{
    Task PublishConfigChangeAsync(string channel, object payload);
    Task SetConfigAsync(string key, string value);
    Task PublishAiConfigAsync(AiConfig config);
    Task PublishModerationRulesAsync(Dictionary<string, string> rules);
}
