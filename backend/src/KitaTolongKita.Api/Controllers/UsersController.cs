using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using KitaTolongKita.Core.DTOs;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Infrastructure.Data;
using KitaTolongKita.Infrastructure.Services;

namespace KitaTolongKita.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IFollowService _follow;
    private readonly ILogger<UsersController> _logger;

    public UsersController(AppDbContext db, IFollowService follow, ILogger<UsersController> logger)
    {
        _db = db;
        _follow = follow;
        _logger = logger;
    }

    /// <summary>Get the current user's full profile.</summary>
    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();
        var counts = await _follow.GetCountsAsync(userId);
        var dealCount = await _db.Deals.CountAsync(d => d.OrganizerId == userId && d.Status == DealStatus.Active && d.ModerationStatus == ModerationStatus.Approved);

        return Ok(new ExpandedUserProfileDto(
            user.Id,
            user.Email,
            user.Phone,
            user.FullName,
            user.AvatarUrl,
            user.EmailVerified,
            user.PhoneVerified,
            user.CreatedAt,
            user.Bio,
            user.City,
            user.Website,
            user.IsVerified,
            user.IsContributor,
            user.ContributorSince,
            user.ContributorRating,
            dealCount,
            counts.followers,
            counts.following
        ));
    }

    /// <summary>Get a user's public profile (for display on other users' screens).</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetPublicProfile(Guid id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound(new { message = "User not found." });

        var dealCount = await _db.Deals
            .CountAsync(d => d.OrganizerId == id
                && d.Status == DealStatus.Active
                && d.ModerationStatus == ModerationStatus.Approved);
        var counts = await _follow.GetCountsAsync(id);
        var isFollowing = await _follow.IsFollowingAsync(GetUserId(), id);

        return Ok(new PublicUserProfileDto(
            user.Id,
            user.FullName,
            user.AvatarUrl,
            user.Bio,
            user.City,
            user.Website,
            user.IsVerified,
            user.IsContributor,
            user.CreatedAt,
            dealCount,
            counts.followers,
            counts.following,
            isFollowing
        ));
    }

    /// <summary>Update the current user's profile (full name, phone, avatar).</summary>
    [HttpPut("me")]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateProfileRequest request)
    {
        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(request.FullName))
            user.FullName = request.FullName;
        if (!string.IsNullOrWhiteSpace(request.Phone))
            user.Phone = request.Phone;
        if (!string.IsNullOrWhiteSpace(request.AvatarUrl))
            user.AvatarUrl = request.AvatarUrl;

        await _db.SaveChangesAsync();

        _logger.LogInformation("User {UserId} updated their profile", userId);

        return Ok(new UserProfileDto(
            user.Id, user.Email, user.Phone, user.FullName,
            user.AvatarUrl, user.EmailVerified, user.PhoneVerified, user.CreatedAt
        ));
    }

    /// <summary>Update profile fields: bio, city, website.</summary>
    [HttpPatch("me/profile")]
    public async Task<IActionResult> UpdateProfileFields([FromBody] UpdateProfileFieldsRequest request)
    {
        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        if (request.Bio != null) user.Bio = request.Bio.Length <= 160 ? request.Bio : request.Bio[..160];
        if (request.City != null) user.City = request.City;
        if (request.Website != null) user.Website = request.Website;

        await _db.SaveChangesAsync();
        _logger.LogInformation("User {UserId} updated profile fields", userId);

        return Ok(new { success = true, bio = user.Bio, city = user.City, website = user.Website });
    }

    /// <summary>Add or update a user address.</summary>
    [HttpPost("addresses")]
    public async Task<IActionResult> AddAddress([FromBody] AddAddressRequest request)
    {
        var userId = GetUserId();

        // If this is set as default, clear other defaults
        if (request.IsDefault)
        {
            var existing = await _db.UserAddresses.Where(a => a.UserId == userId).ToListAsync();
            foreach (var addr in existing) addr.IsDefault = false;
        }

        var address = new UserAddress
        {
            UserId = userId,
            Label = request.Label,
            FullAddress = request.FullAddress,
            Postcode = request.Postcode,
            City = request.City,
            State = request.State,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            IsDefault = request.IsDefault
        };

        _db.UserAddresses.Add(address);
        await _db.SaveChangesAsync();

        return Ok(new { id = address.Id, message = "Address added" });
    }

    /// <summary>Get user addresses.</summary>
    [HttpGet("addresses")]
    public async Task<IActionResult> GetAddresses()
    {
        var userId = GetUserId();
        var addresses = await _db.UserAddresses
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.IsDefault)
            .ThenBy(a => a.Label)
            .ToListAsync();

        return Ok(addresses.Select(a => new AddressDto(a.Id, a.Label, a.FullAddress, a.Postcode, a.City, a.State, a.Latitude, a.Longitude, a.IsDefault)));
    }

    /// <summary>Update the authenticated user's last known location.</summary>
    [Authorize]
    [HttpPatch("location")]
    public async Task<IActionResult> UpdateLocation([FromBody] UpdateLocationRequest request)
    {
        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();
        user.LastKnownLatitude = request.Latitude;
        user.LastKnownLongitude = request.Longitude;
        user.LocationUpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(new { message = "Location updated" });
    }

    /// <summary>Get the authenticated user's notification preferences.</summary>
    [Authorize]
    [HttpGet("preferences/notifications")]
    public async Task<IActionResult> GetNotificationPreferences()
    {
        var userId = GetUserId();
        var pref = await _db.NotificationPreferences.FirstOrDefaultAsync(p => p.UserId == userId);
        if (pref == null)
        {
            pref = new NotificationPreference { UserId = userId };
            _db.NotificationPreferences.Add(pref);
            await _db.SaveChangesAsync();
        }
        return Ok(pref);
    }

    /// <summary>Update the authenticated user's notification preferences.</summary>
    [Authorize]
    [HttpPatch("preferences/notifications")]
    public async Task<IActionResult> UpdateNotificationPreferences([FromBody] UpdateNotificationPreferencesRequest request)
    {
        var userId = GetUserId();
        var pref = await _db.NotificationPreferences.FirstOrDefaultAsync(p => p.UserId == userId);
        if (pref == null)
        {
            pref = new NotificationPreference { UserId = userId };
            _db.NotificationPreferences.Add(pref);
        }
        pref.PushEnabled = request.PushEnabled ?? pref.PushEnabled;
        pref.NotifyByCategory = request.NotifyByCategory ?? pref.NotifyByCategory;
        pref.NotifyByLocation = request.NotifyByLocation ?? pref.NotifyByLocation;
        pref.NotifyByProduct = request.NotifyByProduct ?? pref.NotifyByProduct;
        pref.LocationRadiusKm = request.LocationRadiusKm ?? pref.LocationRadiusKm;
        pref.EnabledCategories = request.EnabledCategories ?? pref.EnabledCategories;
        pref.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(pref);
    }

    /// <summary>Register or update a push notification token.</summary>
    [Authorize]
    [HttpPost("push-token")]
    public async Task<IActionResult> RegisterPushToken([FromBody] RegisterPushTokenRequest request)
    {
        var userId = GetUserId();
        var existing = await _db.PushTokens.FirstOrDefaultAsync(t => t.Token == request.Token);
        if (existing != null)
        {
            existing.Platform = request.Platform;
            existing.LastUsedAt = DateTime.UtcNow;
        }
        else
        {
            // Deactivate old tokens for this user (one active token per platform per user)
            var oldTokens = await _db.PushTokens.Where(t => t.UserId == userId && t.Platform == request.Platform).ToListAsync();
            foreach (var old in oldTokens) old.IsActive = false;
            _db.PushTokens.Add(new PushToken
            {
                UserId = userId,
                Token = request.Token,
                Platform = request.Platform,
                LastUsedAt = DateTime.UtcNow
            });
        }
        await _db.SaveChangesAsync();
        return Ok(new { message = "Push token registered" });
    }

    private Guid GetUserId()
    {
        var idStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(idStr, out var id) ? id : Guid.Empty;
    }
}

public record UserProfileDto(
    Guid Id, string Email, string? Phone, string FullName,
    string? AvatarUrl, bool EmailVerified, bool PhoneVerified, DateTime CreatedAt
);

/// <summary>Public profile — returned when viewing another user's profile.</summary>
public record PublicUserProfileDto(
    Guid Id,
    string FullName,
    string? AvatarUrl,
    string? Bio,
    string? City,
    string? Website,
    bool IsVerified,
    bool IsContributor,
    DateTime CreatedAt,
    int dealCount,
    int followerCount,
    int followingCount,
    bool isFollowing
);

public record UpdateProfileRequest(
    string? FullName,
    string? Phone,
    string? AvatarUrl
);

public record AddAddressRequest(
    string Label,
    string FullAddress,
    string? Postcode,
    string? City,
    string? State,
    double? Latitude,
    double? Longitude,
    bool IsDefault = false
);

public record AddressDto(
    Guid Id, string Label, string FullAddress,
    string? Postcode, string? City, string? State,
    double? Latitude, double? Longitude, bool IsDefault
);

/// <summary>Expanded user profile with social counts and profile fields.</summary>
public record ExpandedUserProfileDto(
    Guid Id, string Email, string? Phone, string FullName, string? AvatarUrl,
    bool EmailVerified, bool PhoneVerified, DateTime CreatedAt,
    string? Bio, string? City, string? Website,
    bool IsVerified, bool IsContributor, DateTime? ContributorSince, decimal? ContributorRating,
    int dealCount, int followerCount, int followingCount
);


public record UpdateProfileFieldsRequest(string? Bio, string? City, string? Website);
