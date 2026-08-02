using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Infrastructure.Data;

namespace KitaTolongKita.Infrastructure.Services;

/// <summary>
/// Buyer-side lookup operations: joining a group buy, QR code generation.
/// </summary>
public interface ILookupService
{
    Task<LookupResultDto?> JoinDealAsync(Guid dealId, Guid userId, int quantity = 1);
    Task<List<MyLookupDto>> GetMyLookupsAsync(Guid userId, string? status);
    Task<MyLookupDetailDto?> GetLookupDetailAsync(Guid lookupId, Guid userId);
    Task<bool> CancelLookupAsync(Guid lookupId, Guid userId);
}

public record LookupResultDto(
    Guid LookupId, string BookingId, string QrCode,
    string Status, DateTime CreatedAt
);

public record MyLookupDto(
    Guid Id, Guid DealId, string DealTitle, string? DealImageUrl,
    string Category, string BookingId, string Status,
    int Quantity, decimal TotalPrice, DateTime CreatedAt,
    bool QrVerified, string ContributorName
);

public record MyLookupDetailDto(
    Guid Id, Guid DealId, string DealTitle, string? DealImageUrl,
    string Category, string BookingId, string Status,
    int Quantity, decimal TotalPrice, DateTime CreatedAt,
    bool QrVerified, DateTime? QrVerifiedAt,
    string ContributorName, string PickupLocation,
    string? DeliveryMode, DateTime? Etd, string? DispatchNotes,
    Guid ContributorId
);

public class LookupService : ILookupService
{
    private readonly AppDbContext _db;
    private readonly IPushNotificationService _push;
    private readonly ILogger<LookupService> _logger;

    public LookupService(AppDbContext db, IPushNotificationService push, ILogger<LookupService> logger)
    {
        _db = db;
        _push = push;
        _logger = logger;
    }

    public async Task<LookupResultDto?> JoinDealAsync(Guid dealId, Guid userId, int quantity = 1)
    {
        var deal = await _db.Deals.FindAsync(dealId);
        if (deal == null || deal.DealType != "GroupBuy")
            return null;
        if (deal.LookupStatus != "Open" && deal.LookupStatus != "Secured")
            return null; // not accepting new lookups

        // Check if already has a lookup
        var existing = await _db.DealLookups
            .FirstOrDefaultAsync(l => l.DealId == dealId && l.UserId == userId);
        if (existing != null) return null;

        var bookingId = GenerateBookingId();
        var qrCode = GenerateQrCode(bookingId, dealId, userId, Guid.Empty);

        var lookup = new DealLookup
        {
            DealId = dealId,
            UserId = userId,
            Quantity = quantity,
            Status = "Pending",
            BookingId = bookingId,
            QrCode = qrCode
        };

        _db.DealLookups.Add(lookup);
        await _db.SaveChangesAsync(); // get the lookup ID

        // Update QR code with correct lookup ID
        lookup.QrCode = GenerateQrCode(bookingId, dealId, userId, lookup.Id);

        // Update deal's current lookups count
        deal.CurrentLookups = await _db.DealLookups.CountAsync(l => l.DealId == dealId);

        // Auto-secure if min lookups reached
        if (deal.CurrentLookups >= deal.MinLookups && deal.LookupStatus == "Open")
        {
            deal.LookupStatus = "Secured";
            deal.Etp = DateTime.UtcNow.AddDays(3);
        }

        await _db.SaveChangesAsync();

        // Notify contributor
        var contributor = await _db.Users.FindAsync(deal.OrganizerId);
        if (contributor != null)
        {
            await _push.SendAndStoreAsync(contributor.Id, "new_lookup",
                "New Group Buy Lookup! 🎉",
                $"{userId} joined your deal '{deal.Title}'! ({deal.CurrentLookups}/{deal.MinLookups} secured)",
                new { dealId, lookupId = lookup.Id });
        }

        return new LookupResultDto(lookup.Id, lookup.BookingId, lookup.QrCode, lookup.Status, lookup.CreatedAt);
    }

    public async Task<List<MyLookupDto>> GetMyLookupsAsync(Guid userId, string? status)
    {
        var q = _db.DealLookups
            .AsNoTracking()
            .Include(l => l.Deal)
            .Where(l => l.UserId == userId);

        if (!string.IsNullOrEmpty(status))
            q = q.Where(l => l.Status == status);

        var lookups = await q.OrderByDescending(l => l.CreatedAt).ToListAsync();

        return lookups.Select(l => new MyLookupDto(
            l.Id, l.DealId, l.Deal.Title,
            l.Deal.ImageUrl ?? l.Deal.ImageUrls.FirstOrDefault(),
            l.Deal.Category, l.BookingId, l.Status,
            l.Quantity, l.Deal.GroupPrice * l.Quantity,
            l.CreatedAt, l.QrVerified,
            l.Deal.Organizer?.FullName ?? "")).ToList();
    }

    public async Task<MyLookupDetailDto?> GetLookupDetailAsync(Guid lookupId, Guid userId)
    {
        var l = await _db.DealLookups
            .AsNoTracking()
            .Include(l => l.Deal).ThenInclude(d => d!.Organizer)
            .FirstOrDefaultAsync(l => l.Id == lookupId && l.UserId == userId);

        if (l == null) return null;

        return new MyLookupDetailDto(
            l.Id, l.DealId, l.Deal!.Title,
            l.Deal.ImageUrl ?? l.Deal.ImageUrls.FirstOrDefault(),
            l.Deal.Category, l.BookingId, l.Status,
            l.Quantity, l.Deal.GroupPrice * l.Quantity,
            l.CreatedAt, l.QrVerified, l.QrVerifiedAt,
            l.Deal.Organizer?.FullName ?? "",
            l.Deal.PickupLocation,
            l.Deal.DeliveryMode, l.Deal.Etd, l.Deal.DispatchNotes,
            l.Deal.OrganizerId);
    }

    public async Task<bool> CancelLookupAsync(Guid lookupId, Guid userId)
    {
        var lookup = await _db.DealLookups
            .FirstOrDefaultAsync(l => l.Id == lookupId && l.UserId == userId);
        if (lookup == null) return false;
        if (lookup.Status == "Delivered") return false; // can't cancel delivered

        lookup.Status = "Cancelled";
        lookup.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    private static string GenerateBookingId()
    {
        // "LK-" + 8 uppercase alphanumeric chars
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var bytes = RandomNumberGenerator.GetBytes(4);
        var id = string.Join("", bytes.Select(b => chars[b % chars.Length]));
        return $"LK-{id[..4].ToUpper()}-{id[4..].ToUpper()}";
    }

    private static string GenerateQrCode(string bookingId, Guid dealId, Guid userId, Guid lookupId)
    {
        var json = JsonSerializer.Serialize(new
        {
            bookingId,
            lookupId = lookupId.ToString(),
            dealId = dealId.ToString(),
            userId = userId.ToString()
        });
        return Convert.ToBase64String(Encoding.UTF8.GetBytes(json));
    }
}
