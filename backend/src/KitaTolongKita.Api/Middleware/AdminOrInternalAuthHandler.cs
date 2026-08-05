using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

namespace KitaTolongKita.Api.Middleware;

/// <summary>
/// Policy handler for "AdminOrInternal" policy.
/// Succeeds if the request was authenticated via either AdminJwt OR InternalApiKey.
/// This allows the admin portal (AdminJwt) and internal services (InternalApiKey)
/// to share the same endpoints without duplicating controller logic.
/// </summary>
public class AdminOrInternalAuthHandler : AuthorizationHandler<AdminOrInternalRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        AdminOrInternalRequirement requirement)
    {
        // Succeed if authenticated via AdminJwt (admin portal browser session)
        if (context.User.Identity?.AuthenticationType == "AdminJwt" && context.User.Identity.IsAuthenticated)
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        // Succeed if authenticated via InternalApiKey (internal microservices)
        if (context.User.Identity?.AuthenticationType == "InternalApiKey" && context.User.Identity.IsAuthenticated)
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        // Also succeed if the user has the internal_service claim (set by InternalServiceAuthMiddleware)
        if (context.User.HasClaim("internal_service", "true"))
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        return Task.CompletedTask;
    }
}

public class AdminOrInternalRequirement : IAuthorizationRequirement { }
