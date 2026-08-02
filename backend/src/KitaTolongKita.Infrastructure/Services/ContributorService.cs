using Microsoft.EntityFrameworkCore;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Infrastructure.Data;

namespace KitaTolongKita.Infrastructure.Services;

public interface IContributorService
{
    // User-facing
    Task<ContributorApplication?> ApplyAsync(Guid userId, ContributorApplicationRequest req);
    Task<ApplicationStatusDto?> GetMyApplicationStatusAsync(Guid userId);
    Task<bool> WithdrawApplicationAsync(Guid userId);

    // Deal management (contributor)
    Task<Deal?> CreateGroupBuyDealAsync(Guid contributorId, CreateGroupBuyDealRequest req);
    Task<List<ContributorDealDto>> GetMyDealsAsync(Guid contributorId, string? status);
    Task<bool> UpdateDealLookupStatusAsync(Guid dealId, string status, int adminId);
    Task<List<LookupDto>> GetDealLookupsAsync(Guid dealId, string? status);
    Task<bool> UpdateLookupStatusAsync(Guid lookupId, string status, int adminId);
    Task<bool> VerifyQrAsync(Guid lookupId, string qrContent, Guid verifierId);
}

public record ApplicationStatusDto(
    Guid Id, string Status, string? RejectionReason,
    DateTime CreatedAt, DateTime? ApprovedAt
);

public record ContributorDealDto(
    Guid Id, string Title, string Category, string LookupStatus,
    int MinLookups, int CurrentLookups, DateTime? LookupDeadline,
    string? DeliveryMode, DateTime CreatedAt
);

public record LookupDto(
    Guid Id, Guid UserId, string UserFullName, string? UserAvatar,
    string BookingId, string Status, int Quantity, DateTime CreatedAt,
    bool QrVerified, DateTime? QrVerifiedAt
);

public record ContributorApplicationRequest(
    string MobileNo, string IcPassportNo, string Nationality,
    string Race, string ResidentStatus
);

public record CreateGroupBuyDealRequest(
    string Title, string Description, string Category,
    decimal OriginalPrice, decimal GroupPrice,
    int MinLookups, int MaxMembers, DateTime Deadline,
    DateTime LookupDeadline, string PickupLocation,
    double? Latitude, double? Longitude, string? LocationName,
    string DeliveryMode, List<string>? ImageUrls
);

public class ContributorService : IContributorService
{
    private readonly AppDbContext _db;
    private readonly IPushNotificationService _push;
    private readonly ILogger<ContributorService> _logger;

    public ContributorService(AppDbContext db, IPushNotificationService push, ILogger<ContributorService> logger)
    {
        _db = db;
        _push = push;
        _logger = logger;
    }

    public async Task<ContributorApplication?> ApplyAsync(Guid userId, ContributorApplicationRequest req)
    {
        // Check user isn't already a contributor
        var user = await _db.Users.FindAsync(userId);
        if (user == null || user.IsContributor) return null;

        // Check no active application
        var existing = await _db.ContributorApplications
            .FirstOrDefaultAsync(a => a.UserId == userId &&
                (a.Status == "Pending" || a.Status == "UnderReview"));
        if (existing != null) return null; // conflict

        var app = new ContributorApplication
        {
            UserId = userId,
            Status = "Pending",
            MobileNo = req.MobileNo,
            IcPassportNo = req.IcPassportNo,
            Nationality = req.Nationality,
            Race = req.Race,
            ResidentStatus = req.ResidentStatus
        };

        _db.ContributorApplications.Add(app);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Contributor application submitted by user {UserId}", userId);
        return app;
    }

    public async Task<ApplicationStatusDto?> GetMyApplicationStatusAsync(Guid userId)
    {
        var app = await _db.ContributorApplications
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.UserId == userId);

        if (app == null) return null;
        return new ApplicationStatusDto(
            app.Id, app.Status, app.RejectionReason, app.CreatedAt, app.ApprovedAt);
    }

    public async Task<bool> WithdrawApplicationAsync(Guid userId)
    {
        var app = await _db.ContributorApplications
            .FirstOrDefaultAsync(a => a.UserId == userId && a.Status == "Pending");
        if (app == null) return false;
        _db.ContributorApplications.Remove(app);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<Deal?> CreateGroupBuyDealAsync(Guid contributorId, CreateGroupBuyDealRequest req)
    {
        var deal = new Deal
        {
            OrganizerId = contributorId,
            Title = req.Title,
            Description = req.Description,
            Category = req.Category,
            OriginalPrice = req.OriginalPrice,
            GroupPrice = req.GroupPrice,
            MinMembers = req.MinLookups,
            MaxMembers = req.MaxMembers,
            Deadline = req.Deadline,
            Status = DealStatus.Draft,
            DealType = "GroupBuy",
            LookupStatus = "Open",
            LookupDeadline = req.LookupDeadline,
            MinLookups = req.MinLookups,
            CurrentLookups = 0,
            DeliveryMode = req.DeliveryMode,
            PickupLocation = req.PickupLocation,
            Latitude = req.Latitude,
            Longitude = req.Longitude,
            LocationName = req.LocationName,
            ImageUrls = req.ImageUrls ?? [],
            ModerationStatus = ModerationStatus.Pending
        };

        _db.Deals.Add(deal);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Group buy deal {DealId} created by contributor {ContributorId}", deal.Id, contributorId);
        return deal;
    }

    public async Task<List<ContributorDealDto>> GetMyDealsAsync(Guid contributorId, string? status)
    {
        var q = _db.Deals
            .AsNoTracking()
            .Where(d => d.OrganizerId == contributorId && d.DealType == "GroupBuy");

        if (!string.IsNullOrEmpty(status))
            q = q.Where(d => d.LookupStatus == status);

        var deals = await q.OrderByDescending(d => d.CreatedAt).Take(50).ToListAsync();
        return deals.Select(d => new ContributorDealDto(
            d.Id, d.Title, d.Category, d.LookupStatus,
            d.MinLookups, d.CurrentLookups, d.LookupDeadline,
            d.DeliveryMode, d.CreatedAt)).ToList();
    }

    public async Task<bool> UpdateDealLookupStatusAsync(Guid dealId, string status, int adminId)
    {
        var deal = await _db.Deals.FindAsync(dealId);
        if (deal == null) return false;

        var validStatuses = new[] { "Open", "Secured", "InProcess", "Dispatched", "Completed", "Expired" };
        if (!validStatuses.Contains(status)) return false;

        deal.LookupStatus = status;
        if (status == "Secured")
            deal.Etp = DateTime.UtcNow.AddDays(3); // default ETA
        if (status == "Dispatched")
            deal.Etd = DateTime.UtcNow.AddDays(5); // default ETA

        await _db.SaveChangesAsync();
        _logger.LogInformation("Deal {DealId} lookup status updated to {Status}", dealId, status);
        return true;
    }

    public async Task<List<LookupDto>> GetDealLookupsAsync(Guid dealId, string? status)
    {
        var q = _db.DealLookups
            .AsNoTracking()
            .Include(l => l.User)
            .Where(l => l.DealId == dealId);

        if (!string.IsNullOrEmpty(status))
            q = q.Where(l => l.Status == status);

        var lookups = await q.OrderByDescending(l => l.CreatedAt).ToListAsync();
        return lookups.Select(l => new LookupDto(
            l.Id, l.UserId, l.User.FullName, l.User.AvatarUrl,
            l.BookingId, l.Status, l.Quantity, l.CreatedAt,
            l.QrVerified, l.QrVerifiedAt)).ToList();
    }

    public async Task<bool> UpdateLookupStatusAsync(Guid lookupId, string status, int adminId)
    {
        var lookup = await _db.DealLookups.FindAsync(lookupId);
        if (lookup == null) return false;

        var validStatuses = new[] { "Pending", "Secured", "InProcess", "Delivered", "Cancelled" };
        if (!validStatuses.Contains(status)) return false;

        lookup.Status = status;
        lookup.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        // Notify user
        await _push.SendAndStoreAsync(lookup.UserId, "lookup_status",
            "Lookup Status Updated",
            $"Your lookup status has been updated to: {status}",
            new { lookupId, dealId = lookup.DealId, bookingId = lookup.BookingId });

        return true;
    }

    public async Task<bool> VerifyQrAsync(Guid lookupId, string qrContent, Guid verifierId)
    {
        var lookup = await _db.DealLookups.FindAsync(lookupId);
        if (lookup == null) return false;

        // Verify QR content matches expected format
        try
        {
            // QR content is Base64 encoded JSON: { "bookingId": "LK-XXXX", "lookupId": "...", "dealId": "...", "userId": "..." }
            var json = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(qrContent));
            using var doc = System.Text.Json.JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (root.TryGetProperty("bookingId", out var bid) &&
                root.TryGetProperty("lookupId", out var lid))
            {
                if (bid.GetString() != lookup.BookingId || lid.GetString() != lookupId.ToString())
                    return false; // QR content doesn't match
            }
        }
        catch
        {
            return false; // Invalid QR content
        }

        lookup.QrVerified = true;
        lookup.QrVerifiedAt = DateTime.UtcNow;
        lookup.QrVerifiedBy = verifierId;
        lookup.Status = "Delivered";
        lookup.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return true;
    }
}
