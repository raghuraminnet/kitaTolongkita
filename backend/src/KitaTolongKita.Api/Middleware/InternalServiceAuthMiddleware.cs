using System.Security.Claims;

namespace KitaTolongKita.Api.Middleware;

/// <summary>
/// Allows internal service-to-service calls from the Admin API to bypass JWT auth.
/// The Admin API sends its requests with the shared `X-Internal-Api-Key` header.
/// If the key matches the configured InternalApiKey, the request runs as an
/// internal service principal without requiring a user JWT token.
///
/// This is registered BEFORE UseAuthentication so the user context is already
/// set before [Authorize] policies are evaluated.
/// </summary>
public class InternalServiceAuthMiddleware
{
    private readonly RequestDelegate _next;
    private readonly string? _apiKey;
    private readonly ILogger<InternalServiceAuthMiddleware> _logger;

    public InternalServiceAuthMiddleware(
        RequestDelegate next,
        Microsoft.Extensions.Configuration.IConfiguration config,
        ILogger<InternalServiceAuthMiddleware> logger)
    {
        _next = next;
        _apiKey = config["InternalApiKey"];
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (!string.IsNullOrWhiteSpace(_apiKey))
        {
            var providedKey = context.Request.Headers["X-Internal-Api-Key"].FirstOrDefault();
            if (!string.IsNullOrEmpty(providedKey) && providedKey == _apiKey)
            {
                // Run as internal service principal — set a synthetic admin identity
                var claims = new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, "0"),
                    new Claim(ClaimTypes.Email, "internal-service@kita-admin"),
                    new Claim(ClaimTypes.Role, "SuperAdmin"),
                    new Claim("internal_service", "true")
                };
                var identity = new ClaimsIdentity(claims, "InternalApiKey");
                context.User = new ClaimsPrincipal(identity);

                _logger.LogDebug("Internal service call authenticated via API key");
            }
        }

        await _next(context);
    }
}

public static class InternalServiceAuthMiddlewareExtensions
{
    public static IApplicationBuilder UseInternalServiceAuth(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<InternalServiceAuthMiddleware>();
    }
}
