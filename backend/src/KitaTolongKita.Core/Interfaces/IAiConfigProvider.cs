namespace KitaTolongKita.Core.Interfaces;

/// <summary>
/// Provides the active AI config (BaseUrl, ApiKey, Provider, Model) to moderation services.
/// Read order: memory cache (hot-reloaded from Redis) → environment variables.
/// </summary>
public interface IAiConfigProvider
{
    string Provider { get; }
    string ApiKey { get; }
    string BaseUrl { get; }
    string Model { get; }
    string Endpoint { get; }         // Azure-specific
    string DeploymentName { get; }   // Azure-specific

    // Moderation thresholds — hot-reloaded from Redis via moderation:rules:updated pub/sub
    int AutoApproveThreshold { get; }
    int PendingReviewThreshold { get; }
}
