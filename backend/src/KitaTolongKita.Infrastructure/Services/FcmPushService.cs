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
    /// <summary>Send a push notification to a specific user's active device.</summary>
    Task SendToUserAsync(Guid userId, string title, string body, object? data = null);

    /// <summary>Send to all devices of a user.</summary>
    Task SendToUserDevicesAsync(Guid userId, string title, string body, object? data = null);

    /// <summary>Send to users by their notification preferences (location/category match).</summary>
    Task SendToMatchingUsersAsync(string category, double lat, double lon, string title, string body, object? data = null);
}

public class FcmPushService : IPushNotificationService
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly AppDbContext _db;
    private readonly ILogger<FcmPushService> _logger;
    private readonly string? _serverKey; // FCM server key (legacy) or service account

    public FcmPushService(
        IHttpClientFactory httpFactory,
        AppDbContext db,
        ILogger<FcmPushService> logger)
    {
        _httpFactory = httpFactory;
        _db = db;
        _logger = logger;
        // In production, use Firebase Admin SDK or OAuth2 with service account.
        // For now we use the FCM HTTP v1 API with an access token.
        _serverKey = null;
    }

    public async Task SendToUserAsync(Guid userId, string title, string body, object? data = null)
    {
        var tokens = await _db.PushTokens
            .Where(t => t.UserId == userId && t.IsActive)
            .Select(t => t.Token)
            .ToListAsync();

        foreach (var token in tokens)
        {
            await SendToTokenAsync(token, title, body, data);
        }
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
            // Location-based check
            if (pref.NotifyByLocation)
            {
                // Get user's last known location from User table
                var user = await _db.Users.FindAsync(pref.UserId);
                if (user?.LastKnownLatitude != null && user.LastKnownLongitude != null)
                {
                    var distance = HaversineKm(lat, lon, user.LastKnownLatitude.Value, user.LastKnownLongitude.Value);
                    if (distance > pref.LocationRadiusKm) continue;
                }
                else continue; // No location known for user
            }

            // Category-based check
            if (pref.NotifyByCategory)
            {
                if (pref.EnabledCategories.Count > 0 && !pref.EnabledCategories.Contains(category))
                    continue;
            }

            userIds.Add(pref.UserId);
        }

        foreach (var userId in userIds.Distinct())
        {
            await SendToUserAsync(userId, title, body, data);
        }
    }

    private async Task SendToTokenAsync(string token, string title, string body, object? data)
    {
        try
        {
            // Use FCM HTTP v1 API
            // Requires OAuth2 access token — simplified here using the server key via HTTP header
            // In production: use Firebase Admin SDK (GOOGLE_APPLICATION_CREDENTIALS) or
            // obtain an OAuth2 token from the Firebase Auth token endpoint.

            var fcmPayload = new
            {
                message = new
                {
                    token,
                    notification = new { title, body },
                    data = data == null ? null : JsonSerializer.Serialize(data),
                    android = new
                    {
                        notification = new
                        {
                            channel_id = "kita_deals",
                            priority = "high"
                        }
                    }
                }
            };

            var http = _httpFactory.CreateClient();
            var json = JsonSerializer.Serialize(fcmPayload);

            // Try FCM v1 with server key (simplified — production should use Firebase Admin SDK)
            http.DefaultRequestHeaders.Clear();
            http.DefaultRequestHeaders.Add("Authorization", $"key={_serverKey ?? ""}");
            http.DefaultRequestHeaders.Add("project_id", ""); // filled from env in production

            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await http.PostAsync("https://fcm.googleapis.com/fcm/send", content);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("FCM send failed: {StatusCode} {Body}", response.StatusCode, responseBody);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send FCM push to token {Token}", token[..Math.Min(20, token.Length)]);
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
