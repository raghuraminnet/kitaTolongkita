using KitaTolongKita.Core.Entities;

namespace KitaTolongKita.Core.DTOs;

public record DealDto(
    Guid Id,
    string Title,
    string Description,
    string Category,
    decimal OriginalPrice,
    decimal GroupPrice,
    int MinMembers,
    int MaxMembers,
    int MembersJoined,
    DateTime Deadline,
    string PickupLocation,
    List<string> ImageUrls,
    DealStatus Status,
    string OrganizerName,
    string? OrganizerAvatar,
    DateTime CreatedAt,
    // Location
    double? Latitude,
    double? Longitude,
    string? LocationName,
    // Engagement
    List<string> Hashtags,
    int UpvoteCount,
    int LikeCount,
    // Moderation
    ModerationStatus ModerationStatus,
    string? ModerationRejectReason,
    // Computed
    double? DistanceKm,
    // Organizer
    Guid? OrganizerId
);

public record CreateDealRequest(
    string Title,
    string Description,
    string Category,
    decimal OriginalPrice,
    decimal GroupPrice,
    int MinMembers,
    int MaxMembers,
    DateTime Deadline,
    string PickupLocation,
    List<string> ImageUrls,
    // Location (optional — will be required)
    double? Latitude,
    double? Longitude,
    string? LocationName,
    List<string>? Hashtags
);

public record DealSearchRequest(
    string? Query,
    string? Category,
    decimal? MinPrice,
    decimal? MaxPrice,
    string? Location,
    string? SortBy,       // "distance" | "price_asc" | "price_desc" | "newest"
    double? Latitude,
    double? Longitude,
    double? RadiusKm,
    int Page = 1,
    int PageSize = 20
);

public record NearbyDealRequest(
    double Latitude,
    double Longitude,
    double RadiusKm = 0.5,
    string? Category = null
);

public record DealReactionSummary(
    bool Upvoted,
    bool Liked,
    int UpvoteCount,
    int LikeCount
);

public record DealVerificationRequest(
    bool OfferStillAvailable,
    string? Notes = null
);

public record PagedResult<T>(List<T> Items, int TotalCount, int Page, int PageSize, int TotalPages);

public record DealOrderDto(
    Guid Id,
    Guid DealId,
    string DealTitle,
    int Quantity,
    decimal TotalPrice,
    OrderStatus Status,
    DateTime CreatedAt
);
