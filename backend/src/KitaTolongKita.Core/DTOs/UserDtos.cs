namespace KitaTolongKita.Core.DTOs;

public record UpdateLocationRequest(double Latitude, double Longitude);
public record UpdateNotificationPreferencesRequest(
    bool? PushEnabled = null,
    bool? NotifyByCategory = null,
    bool? NotifyByLocation = null,
    bool? NotifyByProduct = null,
    double? LocationRadiusKm = null,
    List<string>? EnabledCategories = null
);
public record RegisterPushTokenRequest(string Token, string Platform);
