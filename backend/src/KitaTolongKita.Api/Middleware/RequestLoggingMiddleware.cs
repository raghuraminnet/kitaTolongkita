using System.Diagnostics;
using System.Security.Claims;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Core.Interfaces;

namespace KitaTolongKita.Api.Middleware;

/// <summary>
/// Logs every HTTP request: method, path, status code, duration,
/// authenticated user (if any), and client IP.
/// Level = Info (2xx), Warning (4xx), Error (5xx).
/// </summary>
public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, IActivityLogService logService)
    {
        // Skip static assets and health checks
        var path = context.Request.Path.Value ?? "";
        if (path.StartsWith("/_next") || path.StartsWith("/favicon") || path == "/health")
        {
            await _next(context);
            return;
        }

        var stopwatch = Stopwatch.StartNew();
        var exceptionThrown = false;

        try
        {
            await _next(context);
        }
        catch
        {
            exceptionThrown = true;
            throw; // re-throw so ExceptionHandlingMiddleware catches it
        }
        finally
        {
            stopwatch.Stop();
            var statusCode = context.Response.StatusCode;
            var level = statusCode >= 500 || exceptionThrown ? LogLevel.Error
                : statusCode >= 400 ? LogLevel.Warning
                : LogLevel.Info;

            // Only log API routes
            if (path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase))
            {
                var userId = GetUserId(context);
                var userEmail = GetUserEmail(context);
                var ip = GetClientIp(context);
                var userAgent = context.Request.Headers.UserAgent.ToString();

                var metadata = System.Text.Json.JsonSerializer.Serialize(new
                {
                    method = context.Request.Method,
                    path,
                    statusCode,
                    durationMs = stopwatch.ElapsedMilliseconds
                });

                // Fire-and-forget — don't await so we don't block the response
                _ = logService.LogAsync(
                    level: level,
                    category: LogCategory.System,
                    action: "HttpRequest",
                    message: $"{context.Request.Method} {path} → {statusCode} in {stopwatch.ElapsedMilliseconds}ms",
                    metadata: metadata,
                    userId: userId,
                    userEmail: userEmail,
                    ipAddress: ip,
                    userAgent: userAgent
                );

                _logger.Log(
                    level == LogLevel.Error ? LogLevel.Warning : LogLevel.Information,
                    "{Method} {Path} → {StatusCode} in {ElapsedMs}ms",
                    context.Request.Method, path, statusCode, stopwatch.ElapsedMilliseconds);
            }
        }
    }

    private static Guid? GetUserId(HttpContext ctx)
    {
        var idStr = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(idStr, out var id) ? id : null;
    }

    private static string? GetUserEmail(HttpContext ctx)
        => ctx.User.FindFirst(ClaimTypes.Email)?.Value
           ?? ctx.User.FindFirst("email")?.Value;

    private static string? GetClientIp(HttpContext ctx)
    {
        // Check forwarded headers first (reverse proxy)
        var forwarded = ctx.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(forwarded))
            return forwarded.Split(',')[0].Trim();

        return ctx.Connection.RemoteIpAddress?.ToString();
    }
}

public static class RequestLoggingMiddlewareExtensions
{
    public static IApplicationBuilder UseRequestLogging(this IApplicationBuilder builder)
        => builder.UseMiddleware<RequestLoggingMiddleware>();
}
