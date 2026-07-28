using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace KitaTolongKita.Api.Middleware;

public class LocationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<LocationMiddleware> _logger;

    public LocationMiddleware(RequestDelegate next, ILogger<LocationMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Read latitude/longitude from custom headers
        if (context.Request.Headers.TryGetValue("X-Latitude", out var latHeader)
            && double.TryParse(latHeader, out var lat)
            && context.Request.Headers.TryGetValue("X-Longitude", out var lonHeader)
            && double.TryParse(lonHeader, out var lon))
        {
            context.Items["UserLatitude"] = lat;
            context.Items["UserLongitude"] = lon;
            _logger.LogDebug("Request location: {Lat}, {Lon}", lat, lon);
        }

        await _next(context);
    }
}

public static class LocationMiddlewareExtensions
{
    public static IApplicationBuilder UseLocation(this IApplicationBuilder app)
    {
        return app.UseMiddleware<LocationMiddleware>();
    }
}

public static class HttpContextLocationExtensions
{
    public static double? GetUserLatitude(this HttpContext ctx) => ctx.Items["UserLatitude"] as double?;
    public static double? GetUserLongitude(this HttpContext ctx) => ctx.Items["UserLongitude"] as double?;
}
