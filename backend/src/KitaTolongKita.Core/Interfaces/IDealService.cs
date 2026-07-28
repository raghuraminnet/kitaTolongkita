using KitaTolongKita.Core.DTOs;
using KitaTolongKita.Core.Entities;

namespace KitaTolongKita.Core.Interfaces;

public interface IDealService
{
    // ── Search & Listing ────────────────────────────────────────────────────────
    Task<PagedResult<DealDto>> SearchDealsAsync(DealSearchRequest request);
    Task<List<DealDto>> SuggestNearbyDealsAsync(double lat, double lon, double radiusKm, string? category, int limit = 5);

    // ── CRUD ──────────────────────────────────────────────────────────────────
    Task<DealDto?> GetDealByIdAsync(Guid id);
    Task<DealDto> CreateDealAsync(CreateDealRequest request, Guid organizerId);
    Task<DealDto> UpdateDealAsync(Deal deal);

    // ── Orders ─────────────────────────────────────────────────────────────────
    Task<DealOrderDto> JoinDealAsync(Guid dealId, Guid buyerId, int quantity, string? notes);
    Task<List<DealOrderDto>> GetUserOrdersAsync(Guid userId);

    // ── Reactions ───────────────────────────────────────────────────────────────
    Task<DealReactionSummary> ToggleUpvoteAsync(Guid dealId, Guid userId);
    Task<DealReactionSummary> ToggleLikeAsync(Guid dealId, Guid userId);
    Task<DealReactionSummary> GetReactionsAsync(Guid dealId, Guid? userId = null);

    // ── Verification ────────────────────────────────────────────────────────────
    Task<List<DealDto>> GetNearbyPendingVerificationAsync(double lat, double lon, double radiusKm, Guid userId);
    Task VerifyDealAsync(Guid dealId, Guid userId, bool offerStillAvailable, string? notes);
}
