using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace KitaTolongKita.Infrastructure.Services;

public interface IPushNotificationService
{
    /// <summary>Send a push notification to a specific user's active devices.</summary>
    Task SendToUserAsync(Guid userId, string title, string body, object? data = null);

    /// <summary>Send to all active devices of a user.</summary>
    Task SendToUserDevicesAsync(Guid userId, string title, string body, object? data = null);

    /// <summary>Send to users by their notification preferences (location/category match).</summary>
    Task SendToMatchingUsersAsync(string category, double lat, double lon, string title, string body, object? data = null);

    /// <summary>Send and persist a notification to a user's notification history.</summary>
    Task SendAndStoreAsync(Guid userId, string type, string title, string body, object? data = null);

    /// <summary>Broadcast a push notification to all active devices or filtered by role.</summary>
    Task<int> BroadcastAsync(string title, string body, object? data = null, string? targetRole = null);

    /// <summary>Send a direct test push notification to a single token.</summary>
    Task<(bool Success, string Message)> SendTestNotificationAsync(string token, string title, string body, object? data = null);
}

/// <summary>
/// Dual Push Service supporting Expo Push API (primary for Expo React Native clients)
/// and Google FCM fallback, with automatic dead-token pruning and notification history persistence.
/// </summary>
public class FcmPushService : IPushNotificationService
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly AppDbContext _db;
    private readonly ILogger<FcmPushService> _logger;
    private readonly string? _expoAccessToken;
    private readonly string? _fcmServerKey;

    public FcmPushService(
        IHttpClientFactory httpFactory,
        AppDbContext db,
        IConfiguration config,
        ILogger<FcmPushService> logger)
    {
        _httpFactory = httpFactory;
        _db = db;
        _logger = logger;
        _expoAccessToken = config["Expo:AccessToken"] ?? Environment.GetEnvironmentVariable("EXPO_ACCESS_TOKEN");
        _fcmServerKey = config["Fcm:ServerKey"] ?? Environment.GetEnvironmentVariable("FCM_SERVER_KEY");
    }

    public async Task SendToUserAsync(Guid userId, string title, string body, object? data = null)
    {
        var activeTokens = await _db.PushTokens
            .Where(t => t.UserId == userId && t.IsActive)
            .ToListAsync();

        if (activeTokens.Count == 0)
        {
            _logger.LogDebug("No active push tokens found for user {UserId}", userId);
            return;
        }

        await DispatchToTokensAsync(activeTokens, title, body, data);
    }

    public async Task SendToUserDevicesAsync(Guid userId, string title, string body, object? data = null)
    {
        await SendToUserAsync(userId, title, body, data);
    }

    public async Task SendToMatchingUsersAsync(string category, double lat, double lon, string title, string body, object? data = null)
    {
        var matchingPrefs = await _db.NotificationPreferences
            .Where(p => p.PushEnabled)
            .ToListAsync();

        var userIds = new List<Guid>();

        foreach (var pref in matchingPrefs)
        {
            if (pref.NotifyByLocation)
            {
                var user = await _db.Users.FindAsync(pref.UserId);
                if (user?.LastKnownLatitude != null && user.LastKnownLongitude != null)
                {
                    var distance = HaversineKm(lat, lon, user.LastKnownLatitude.Value, user.LastKnownLongitude.Value);
                    if (distance > pref.LocationRadiusKm) continue;
                }
                else continue;
            }

            if (pref.NotifyByCategory)
            {
                if (pref.EnabledCategories.Count > 0 && !pref.EnabledCategories.Contains(category))
                    continue;
            }

            userIds.Add(pref.UserId);
        }

        foreach (var userId in userIds.Distinct())
        {
            await SendAndStoreAsync(userId, "deal_match", title, body, data);
        }
    }

    public async Task SendAndStoreAsync(Guid userId, string type, string title, string body, object? data = null)
    {
        // 1. Store in DB
        try
        {
            var notification = new UserNotification
            {
                UserId = userId,
                Type = type,
                Title = title,
                Body = body,
                DataJson = data == null ? null : JsonSerializer.Serialize(data),
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
            _db.UserNotifications.Add(notification);
            await _db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to store notification history for user {UserId}", userId);
        }

        // 2. Send push to active user tokens
        await SendToUserAsync(userId, title, body, data);
    }

    public async Task<int> BroadcastAsync(string title, string body, object? data = null, string? targetRole = null)
    {
        var query = _db.PushTokens.Where(t => t.IsActive);

        if (!string.IsNullOrWhiteSpace(targetRole))
        {
            // Join with Users to filter by role (e.g., "contributor")
            var userIdsWithRole = await _db.Users
                .Where(u => u.Role == targetRole)
                .Select(u => u.Id)
                .ToListAsync();

            query = query.Where(t => userIdsWithRole.Contains(t.UserId));
        }

        var activeTokens = await query.ToListAsync();
        if (activeTokens.Count == 0) return 0;

        await DispatchToTokensAsync(activeTokens, title, body, data);
        return activeTokens.Count;
    }

    public async Task<(bool Success, string Message)> SendTestNotificationAsync(string token, string title, string body, object? data = null)
    {
        try
        {
            if (IsExpoPushToken(token))
            {
                return await SendSingleExpoPushAsync(token, title, body, data);
            }
            else
            {
                return await SendSingleFcmPushAsync(token, title, body, data);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send test push notification to {Token}", token);
            return (false, ex.Message);
        }
    }

    private async Task DispatchToTokensAsync(List<PushToken> tokens, string title, string body, object? data)
    {
        var expoTokens = tokens.Where(t => IsExpoPushToken(t.Token)).ToList();
        var fcmTokens = tokens.Where(t => !IsExpoPushToken(t.Token)).ToList();

        if (expoTokens.Count > 0)
        {
            await SendExpoBatchAsync(expoTokens, title, body, data);
        }

        if (fcmTokens.Count > 0)
        {
            foreach (var token in fcmTokens)
            {
                await SendSingleFcmPushAsync(token.Token, title, body, data);
            }
        }
    }

    private static bool IsExpoPushToken(string token)
    {
        return !string.IsNullOrWhiteSpace(token) &&
               (token.StartsWith("ExponentPushToken[", StringComparison.OrdinalIgnoreCase) ||
                token.StartsWith("ExpoPushToken[", StringComparison.OrdinalIgnoreCase));
    }

    /// <summary>
    /// Sends push notifications in batches of up to 100 via the official Expo Push API.
    /// Handles unregistering invalid tokens automatically.
    /// </summary>
    private async Task SendExpoBatchAsync(List<PushToken> tokens, string title, string body, object? data)
    {
        const int batchSize = 100;
        var client = _httpFactory.CreateClient();

        if (!string.IsNullOrWhiteSpace(_expoAccessToken))
        {
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _expoAccessToken);
        }

        for (int i = 0; i < tokens.Count; i += batchSize)
        {
            var chunk = tokens.Skip(i).Take(batchSize).ToList();
            var payload = chunk.Select(t => new
            {
                to = t.Token,
                title = title,
                body = body,
                sound = "default",
                priority = "high",
                channelId = "default",
                data = data ?? new { }
            }).ToList();

            try
            {
                var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                var response = await client.PostAsync("https://exp.host/--/api/v2/push/send", content);
                var responseJson = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Expo push batch sent successfully to {Count} tokens", chunk.Count);
                    await HandleExpoTicketReceiptsAsync(chunk, responseJson);
                }
                else
                {
                    _logger.LogWarning("Expo push batch failed: Status {Status}, Body {Body}", response.StatusCode, responseJson);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception during Expo push batch dispatch");
            }
        }
    }

    private async Task<(bool Success, string Message)> SendSingleExpoPushAsync(string token, string title, string body, object? data)
    {
        var client = _httpFactory.CreateClient();
        if (!string.IsNullOrWhiteSpace(_expoAccessToken))
        {
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _expoAccessToken);
        }

        var payload = new
        {
            to = token,
            title = title,
            body = body,
            sound = "default",
            priority = "high",
            channelId = "default",
            data = data ?? new { }
        };

        var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        var response = await client.PostAsync("https://exp.host/--/api/v2/push/send", content);
        var responseJson = await response.Content.ReadAsStringAsync();

        if (response.IsSuccessStatusCode)
        {
            return (true, "Expo push delivered successfully");
        }
        return (false, $"Expo push error ({response.StatusCode}): {responseJson}");
    }

    private async Task<(bool Success, string Message)> SendSingleFcmPushAsync(string token, string title, string body, object? data)
    {
        if (string.IsNullOrWhiteSpace(_fcmServerKey))
        {
            _logger.LogInformation("FCM Push skipped: FCM_SERVER_KEY not configured. Target token: {Token}", token[..Math.Min(15, token.Length)]);
            return (true, "FCM key not configured; delivery skipped gracefully in dev.");
        }

        try
        {
            var client = _httpFactory.CreateClient();
            client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", $"key={_fcmServerKey}");

            var payload = new
            {
                to = token,
                notification = new { title, body, sound = "default" },
                data = data ?? new { },
                priority = "high"
            };

            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var res = await client.PostAsync("https://fcm.googleapis.com/fcm/send", content);
            var resBody = await res.Content.ReadAsStringAsync();

            return (res.IsSuccessStatusCode, resBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send FCM push to {Token}", token);
            return (false, ex.Message);
        }
    }

    /// <summary>
    /// Parses Expo response tickets. If a device has uninstalled the app ("DeviceNotRegistered"),
    /// marks the token inactive in the database so we stop spamming Expo.
    /// </summary>
    private async Task HandleExpoTicketReceiptsAsync(List<PushToken> sentTokens, string responseJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(responseJson);
            if (doc.RootElement.TryGetProperty("data", out var dataElem) && dataElem.ValueKind == JsonValueKind.Array)
            {
                var idx = 0;
                var tokensToDeactivate = new List<PushToken>();

                foreach (var ticket in dataElem.EnumerateArray())
                {
                    if (idx < sentTokens.Count && ticket.TryGetProperty("status", out var status) && status.GetString() == "error")
                    {
                        if (ticket.TryGetProperty("details", out var details) &&
                            details.TryGetProperty("error", out var err) &&
                            err.GetString() == "DeviceNotRegistered")
                        {
                            tokensToDeactivate.Add(sentTokens[idx]);
                        }
                    }
                    idx++;
                }

                if (tokensToDeactivate.Count > 0)
                {
                    foreach (var tok in tokensToDeactivate)
                    {
                        tok.IsActive = false;
                    }
                    await _db.SaveChangesAsync();
                    _logger.LogInformation("Deactivated {Count} unregistered Expo push tokens", tokensToDeactivate.Count);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse Expo push tickets response");
        }
    }

    private static double HaversineKm(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371;
        var dLat = ToRad(lat2 - lat1);
        var dLon = ToRad(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return R * c;
    }

    private static double ToRad(double deg) => deg * Math.PI / 180;
}
