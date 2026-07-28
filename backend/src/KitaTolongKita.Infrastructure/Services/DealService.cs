using Microsoft.EntityFrameworkCore;
using KitaTolongKita.Core.DTOs;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Core.Interfaces;
using KitaTolongKita.Infrastructure.Data;

namespace KitaTolongKita.Infrastructure.Services;

public class DealService : IDealService
{
    private readonly AppDbContext _db;
    private readonly IElasticsearchService _es;
    private readonly ModerationQueueService _moderationQueue;
    private readonly ILogger<DealService> _logger;

    public DealService(
        AppDbContext db,
        IElasticsearchService es,
        ModerationQueueService moderationQueue,
        ILogger<DealService> logger)
    {
        _db = db;
        _es = es;
        _moderationQueue = moderationQueue;
        _logger = logger;
    }

    // ── Search & Listing ──────────────────────────────────────────────────────

    public async Task<PagedResult<DealDto>> SearchDealsAsync(DealSearchRequest request)
    {
        try
        {
            // Try Elasticsearch first
            var (items, totalCount) = await _es.SearchDealsAsync(request);
            if (items.Count > 0 || totalCount >= 0)
            {
                // Enrich with organizer names from DB
                var enriched = await EnrichWithOrganizerNamesAsync(items);
                var pageSize = request.PageSize > 0 ? request.PageSize : 20;
                var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);
                return new PagedResult<DealDto>(enriched, totalCount, request.Page, pageSize, totalPages);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Elasticsearch search failed, falling back to PostgreSQL");
        }

        // Fallback: PostgreSQL search
        return await SearchDealsFromDbAsync(request);
    }

    public async Task<List<DealDto>> SuggestNearbyDealsAsync(double lat, double lon, double radiusKm, string? category, int limit = 5)
    {
        try
        {
            return await _es.SuggestNearbyAsync(lat, lon, radiusKm, category, limit);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "ES nearby suggestion failed");
            return new List<DealDto>();
        }
    }

    private async Task<PagedResult<DealDto>> SearchDealsFromDbAsync(DealSearchRequest request)
    {
        var query = _db.Deals
            .Include(d => d.Orders)
            .Where(d => d.Status == DealStatus.Active && d.ModerationStatus == ModerationStatus.Approved);

        if (!string.IsNullOrEmpty(request.Query))
            query = query.Where(d => d.Title.Contains(request.Query) || d.Description.Contains(request.Query));

        if (!string.IsNullOrEmpty(request.Category) && request.Category != "All")
            query = query.Where(d => d.Category == request.Category);

        if (request.MinPrice.HasValue)
            query = query.Where(d => d.GroupPrice >= request.MinPrice);

        if (request.MaxPrice.HasValue)
            query = query.Where(d => d.GroupPrice <= request.MaxPrice);

        query = (request.SortBy?.ToLowerInvariant()) switch
        {
            "price_asc" => query.OrderBy(d => d.GroupPrice),
            "price_desc" => query.OrderByDescending(d => d.GroupPrice),
            "newest" => query.OrderByDescending(d => d.CreatedAt),
            "popular" => query.OrderByDescending(d => d.MembersJoined),
            _ => query.OrderByDescending(d => d.CreatedAt)
        };

        var totalCount = await query.CountAsync();
        var pageSize = request.PageSize > 0 ? request.PageSize : 20;
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var deals = await query
            .Skip((request.Page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = deals.Select(d => ToDealDto(d)).ToList();
        return new PagedResult<DealDto>(dtos, totalCount, request.Page, pageSize, totalPages);
    }

    // ── CRUD ──────────────────────────────────────────────────────────────────

    public async Task<DealDto?> GetDealByIdAsync(Guid id)
    {
        var deal = await _db.Deals
            .Include(d => d.Orders)
            .FirstOrDefaultAsync(d => d.Id == id);

        return deal == null ? null : ToDealDto(deal);
    }

    public async Task<DealDto> CreateDealAsync(CreateDealRequest request, Guid organizerId)
    {
        var deal = new Deal
        {
            OrganizerId = organizerId,
            Title = request.Title,
            Description = request.Description,
            Category = request.Category,
            OriginalPrice = request.OriginalPrice,
            GroupPrice = request.GroupPrice,
            MinMembers = request.MinMembers,
            MaxMembers = request.MaxMembers,
            Deadline = request.Deadline,
            PickupLocation = request.PickupLocation,
            ImageUrls = request.ImageUrls ?? new(),
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            LocationName = request.LocationName,
            Hashtags = request.Hashtags ?? new(),
            Status = DealStatus.Active,
            PublishedAt = DateTime.UtcNow,
            ModerationStatus = ModerationStatus.Pending
        };

        _db.Deals.Add(deal);
        await _db.SaveChangesAsync();

        // Index in ElasticSearch (async, don't block)
        _ = Task.Run(async () =>
        {
            try { await _es.IndexDealAsync(deal); }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to index deal {DealId}", deal.Id); }
        });

        // Enqueue for AI moderation (background)
        _moderationQueue.Enqueue(deal.Id);

        return ToDealDto(deal);
    }

    public async Task<DealDto> UpdateDealAsync(Deal deal)
    {
        _db.Deals.Update(deal);
        await _db.SaveChangesAsync();

        try { await _es.UpdateDealAsync(deal); }
        catch (Exception ex) { _logger.LogWarning(ex, "Failed to update deal in ES: {DealId}", deal.Id); }

        return ToDealDto(deal);
    }

    // ── Orders ─────────────────────────────────────────────────────────────────

    public async Task<DealOrderDto> JoinDealAsync(Guid dealId, Guid buyerId, int quantity, string? notes)
    {
        var deal = await _db.Deals.FindAsync(dealId)
            ?? throw new InvalidOperationException("Deal not found.");

        if (deal.Status != DealStatus.Active)
            throw new InvalidOperationException("This deal is no longer accepting orders.");

        if (deal.Deadline < DateTime.UtcNow)
            throw new InvalidOperationException("This deal has ended.");

        if (deal.MembersJoined + quantity > deal.MaxMembers)
            throw new InvalidOperationException("Not enough spots remaining.");

        var order = new DealOrder
        {
            DealId = dealId,
            BuyerId = buyerId,
            Quantity = quantity,
            TotalPrice = deal.GroupPrice * quantity,
            Notes = notes
        };

        deal.MembersJoined += quantity;
        _db.DealOrders.Add(order);
        await _db.SaveChangesAsync();

        return ToOrderDto(order, deal);
    }

    public async Task<List<DealOrderDto>> GetUserOrdersAsync(Guid userId)
    {
        var orders = await _db.DealOrders
            .Include(o => o.Deal)
            .Where(o => o.BuyerId == userId)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        return orders.Select(o => ToOrderDto(o, o.Deal!)).ToList();
    }

    // ── Reactions ──────────────────────────────────────────────────────────────

    public async Task<DealReactionSummary> ToggleUpvoteAsync(Guid dealId, Guid userId)
    {
        var deal = await _db.Deals.FindAsync(dealId)
            ?? throw new InvalidOperationException("Deal not found.");

        var existing = await _db.Set<DealReaction>()
            .FirstOrDefaultAsync(r => r.DealId == dealId && r.UserId == userId && r.Type == ReactionType.Upvote);

        if (existing != null)
        {
            _db.Set<DealReaction>().Remove(existing);
            deal.UpvoteCount = Math.Max(0, deal.UpvoteCount - 1);
        }
        else
        {
            _db.Set<DealReaction>().Add(new DealReaction
            {
                DealId = dealId,
                UserId = userId,
                Type = ReactionType.Upvote
            });
            deal.UpvoteCount++;
        }

        await _db.SaveChangesAsync();
        _ = Task.Run(async () => { try { await _es.UpdateDealAsync(deal); } catch { } });

        return await GetReactionsAsync(dealId, userId);
    }

    public async Task<DealReactionSummary> ToggleLikeAsync(Guid dealId, Guid userId)
    {
        var deal = await _db.Deals.FindAsync(dealId)
            ?? throw new InvalidOperationException("Deal not found.");

        var existing = await _db.Set<DealReaction>()
            .FirstOrDefaultAsync(r => r.DealId == dealId && r.UserId == userId && r.Type == ReactionType.Like);

        if (existing != null)
        {
            _db.Set<DealReaction>().Remove(existing);
            deal.LikeCount = Math.Max(0, deal.LikeCount - 1);
        }
        else
        {
            _db.Set<DealReaction>().Add(new DealReaction
            {
                DealId = dealId,
                UserId = userId,
                Type = ReactionType.Like
            });
            deal.LikeCount++;
        }

        await _db.SaveChangesAsync();
        _ = Task.Run(async () => { try { await _es.UpdateDealAsync(deal); } catch { } });

        return await GetReactionsAsync(dealId, userId);
    }

    public async Task<DealReactionSummary> GetReactionsAsync(Guid dealId, Guid? userId = null)
    {
        var deal = await _db.Deals.FindAsync(dealId);
        if (deal == null) return new DealReactionSummary(false, false, 0, 0);

        bool upvoted = false, liked = false;
        if (userId.HasValue)
        {
            upvoted = await _db.Set<DealReaction>()
                .AnyAsync(r => r.DealId == dealId && r.UserId == userId.Value && r.Type == ReactionType.Upvote);
            liked = await _db.Set<DealReaction>()
                .AnyAsync(r => r.DealId == dealId && r.UserId == userId.Value && r.Type == ReactionType.Like);
        }

        return new DealReactionSummary(upvoted, liked, deal.UpvoteCount, deal.LikeCount);
    }

    // ── Verification ──────────────────────────────────────────────────────────

    public async Task<List<DealDto>> GetNearbyPendingVerificationAsync(double lat, double lon, double radiusKm, Guid userId)
    {
        // Get active deals within ~500m that user hasn't already verified
        var verifiedDealIds = await _db.Set<DealVerification>()
            .Where(v => v.UserId == userId)
            .Select(v => v.DealId)
            .ToListAsync();

        var deals = await _db.Deals
            .Where(d => d.Status == DealStatus.Active
                && d.ModerationStatus == ModerationStatus.Approved
                && d.Latitude.HasValue && d.Longitude.HasValue)
            .Where(d => !verifiedDealIds.Contains(d.Id))
            .ToListAsync();

        const double EarthRadiusKm = 6371;
        var nearbyDeals = deals
            .Select(d => new
            {
                Deal = d,
                Distance = HaversineKm(lat, lon, d.Latitude!.Value, d.Longitude!.Value)
            })
            .Where(x => x.Distance <= radiusKm)
            .OrderBy(x => x.Distance)
            .Take(5)
            .Select(x => ToDealDto(x.Deal, x.Distance))
            .ToList();

        return nearbyDeals;
    }

    public async Task VerifyDealAsync(Guid dealId, Guid userId, bool offerStillAvailable, string? notes)
    {
        var deal = await _db.Deals.FindAsync(dealId)
            ?? throw new InvalidOperationException("Deal not found.");

        // Check if already verified by this user
        var existing = await _db.Set<DealVerification>()
            .FirstOrDefaultAsync(v => v.DealId == dealId && v.UserId == userId);

        if (existing != null) return; // already verified

        _db.Set<DealVerification>().Add(new DealVerification
        {
            DealId = dealId,
            UserId = userId,
            OfferStillAvailable = offerStillAvailable,
            Notes = notes
        });

        deal.VerificationCount++;
        deal.LastVerifiedAt = DateTime.UtcNow;

        // If 3+ "not available" votes in 7 days → expire deal
        if (!offerStillAvailable)
        {
            var recentFalseCount = await _db.Set<DealVerification>()
                .CountAsync(v => v.DealId == dealId
                    && !v.OfferStillAvailable
                    && v.VerifiedAt >= DateTime.UtcNow.AddDays(-7));

            if (recentFalseCount >= 3)
            {
                deal.Status = DealStatus.Expired;
                deal.ModerationStatus = ModerationStatus.Expired;
            }
        }

        await _db.SaveChangesAsync();
        _ = Task.Run(async () => { try { await _es.UpdateDealAsync(deal); } catch { } });
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private async Task<List<DealDto>> EnrichWithOrganizerNamesAsync(List<DealDto> items)
    {
        if (items.Count == 0) return items;
        var userIds = items.Select(i =>
        {
            // OrganizerId is in the deal — but we don't have it in DealDto directly.
            // For now return empty list and just return items as-is
            return Guid.Empty;
        }).Distinct().ToList();

        // We don't store OrganizerId in DealDto yet, so skip enrichment for now
        return items;
    }

    private static DealDto ToDealDto(Deal d, double? distanceKm = null) => new(
        d.Id, d.Title, d.Description, d.Category,
        d.OriginalPrice, d.GroupPrice, d.MinMembers, d.MaxMembers,
        d.MembersJoined, d.Deadline, d.PickupLocation, d.ImageUrls,
        d.Status, "", null, d.CreatedAt,
        d.Latitude, d.Longitude, d.LocationName,
        d.Hashtags, d.UpvoteCount, d.LikeCount,
        d.ModerationStatus, d.ModerationRejectReason,
        distanceKm
    );

    private static DealOrderDto ToOrderDto(DealOrder o, Deal d) => new(
        o.Id, o.DealId, d.Title, o.Quantity, o.TotalPrice, o.Status, o.CreatedAt
    );

    private static double HaversineKm(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371;
        var dLat = ToRad(lat2 - lat1);
        var dLon = ToRad(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return R * c;
    }

    private static double ToRad(double deg) => deg * Math.PI / 180;
}
