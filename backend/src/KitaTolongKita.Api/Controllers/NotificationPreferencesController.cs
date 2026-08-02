using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Infrastructure.Data;

namespace KitaTolongKita.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class NotificationPreferencesController : ControllerBase
{
    private readonly AppDbContext _db;
    public NotificationPreferencesController(AppDbContext db) => _db = db;

    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>Get current user's granular notification preferences.</summary>
    [HttpGet("me/notification-settings")]
    public async Task<IActionResult> GetSettings()
    {
        var pref = await _db.UserNotificationPreferences
            .FirstOrDefaultAsync(p => p.UserId == CurrentUserId);

        if (pref == null)
        {
            // Return defaults
            return Ok(new NotificationSettingsDto(
                NotifyFollow: true,
                NotifyFollowedDeal: false,
                NotifyLikes: true,
                NotifyComments: true,
                NotifyLookups: true
            ));
        }

        return Ok(new NotificationSettingsDto(
            pref.NotifyFollow,
            pref.NotifyFollowedDeal,
            pref.NotifyLikes,
            pref.NotifyComments,
            pref.NotifyLookups
        ));
    }

    /// <summary>Update current user's granular notification preferences.</summary>
    [HttpPatch("me/notification-settings")]
    public async Task<IActionResult> UpdateSettings([FromBody] UpdateNotificationSettingsRequest req)
    {
        var pref = await _db.UserNotificationPreferences
            .FirstOrDefaultAsync(p => p.UserId == CurrentUserId);

        if (pref == null)
        {
            pref = new UserNotificationPreference { UserId = CurrentUserId };
            _db.UserNotificationPreferences.Add(pref);
        }

        if (req.NotifyFollow != null) pref.NotifyFollow = req.NotifyFollow.Value;
        if (req.NotifyFollowedDeal != null) pref.NotifyFollowedDeal = req.NotifyFollowedDeal.Value;
        if (req.NotifyLikes != null) pref.NotifyLikes = req.NotifyLikes.Value;
        if (req.NotifyComments != null) pref.NotifyComments = req.NotifyComments.Value;
        if (req.NotifyLookups != null) pref.NotifyLookups = req.NotifyLookups.Value;
        pref.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(new NotificationSettingsDto(
            pref.NotifyFollow, pref.NotifyFollowedDeal,
            pref.NotifyLikes, pref.NotifyComments, pref.NotifyLookups
        ));
    }
}

public record NotificationSettingsDto(
    bool NotifyFollow,
    bool NotifyFollowedDeal,
    bool NotifyLikes,
    bool NotifyComments,
    bool NotifyLookups
);

public record UpdateNotificationSettingsRequest(
    bool? NotifyFollow,
    bool? NotifyFollowedDeal,
    bool? NotifyLikes,
    bool? NotifyComments,
    bool? NotifyLookups
);
