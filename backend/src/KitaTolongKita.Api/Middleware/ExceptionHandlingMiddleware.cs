using System.Diagnostics;
using System.Security.Claims;
using System.Text.Json;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Core.Interfaces;
using LogLevel = KitaTolongKita.Core.Entities.LogLevel;

namespace KitaTolongKita.Api.Middleware;

/// <summary>
/// Catches all unhandled exceptions, logs them with Level=Error
/// (including stack trace in Metadata), and returns a clean problem-details
/// response to the client.
/// </summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly IHostEnvironment _env;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger,
        IHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context, IActivityLogService logService)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex, logService);
        }
    }

    private async Task HandleExceptionAsync(
        HttpContext context,
        Exception exception,
        IActivityLogService logService)
    {
        var path = context.Request.Path.Value ?? "";
        var userId = GetUserId(context);
        var userEmail = GetUserEmail(context);
        var ip = GetClientIp(context);
        var userAgent = context.Request.Headers.UserAgent.ToString();

        var traceId = Activity.Current?.Id ?? context.TraceIdentifier;

        var metadata = JsonSerializer.Serialize(new
        {
            exceptionType = exception.GetType().FullName,
            message = exception.Message,
            stackTrace = _env.IsDevelopment() ? exception.StackTrace : null,
            traceId
        });

        // Log to activity log
        _ = logService.LogAsync(
            level: LogLevel.Error,
            category: LogCategory.System,
            action: "UnhandledException",
            message: $"{exception.GetType().Name}: {exception.Message} | Path: {path}",
            metadata: metadata,
            userId: userId,
            userEmail: userEmail,
            ipAddress: ip,
            userAgent: userAgent
        );

        _logger.LogError(exception,
            "Unhandled exception. TraceId={TraceId} Path={Path} User={UserEmail} Message={Message}",
            traceId, path, userEmail ?? "-", exception.Message);

        // Return problem details
        context.Response.StatusCode = exception switch
        {
            ArgumentException => StatusCodes.Status400BadRequest,
            UnauthorizedAccessException => StatusCodes.Status401Unauthorized,
            KeyNotFoundException => StatusCodes.Status404NotFound,
            _ => StatusCodes.Status500InternalServerError
        };

        context.Response.ContentType = "application/json";

        var problem = new
        {
            type = $"https://httpstatuses.com/{context.Response.StatusCode}",
            title = exception switch
            {
                ArgumentException => "Bad Request",
                UnauthorizedAccessException => "Unauthorized",
                KeyNotFoundException => "Not Found",
                _ => "Internal Server Error"
            },
            status = context.Response.StatusCode,
            detail = _env.IsDevelopment() ? exception.Message : "An unexpected error occurred.",
            traceId,
            instance = path
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(problem));
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
        var forwarded = ctx.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(forwarded))
            return forwarded.Split(',')[0].Trim();
        return ctx.Connection.RemoteIpAddress?.ToString();
    }
}

public static class ExceptionHandlingMiddlewareExtensions
{
    public static IApplicationBuilder UseExceptionHandling(this IApplicationBuilder builder)
        => builder.UseMiddleware<ExceptionHandlingMiddleware>();
}
