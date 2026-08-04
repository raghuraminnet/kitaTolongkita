using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace KitaTolongKita.Api.Middleware;

/// <summary>
/// Authentication handler that validates the X-Internal-Api-Key header.
/// Used for admin-to-api service calls (not user-facing).
/// </summary>
public class InternalApiKeyAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private const string KeyName = "X-Internal-Api-Key";
    private readonly string _validKey;

    public InternalApiKeyAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IConfiguration config)
        : base(options, logger, encoder)
    {
        _validKey = config["InternalApiKey"] ?? "kita-internal-service-key-2024";
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(KeyName, out var keyHeader))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var providedKey = keyHeader.ToString();
        if (providedKey != _validKey)
        {
            return Task.FromResult(AuthenticateResult.Fail("Invalid internal API key"));
        }

        // Create a minimal identity — treat as authenticated internal service
        var claims = new[]
        {
            new Claim(ClaimTypes.Name, "InternalService"),
            new Claim(ClaimTypes.Role, "InternalApi")
        };

        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
