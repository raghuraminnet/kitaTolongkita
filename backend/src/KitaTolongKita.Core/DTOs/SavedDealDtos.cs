using System;
using System.Collections.Generic;

namespace KitaTolongKita.Core.DTOs;

// ─── Saved List DTOs ────────────────────────────────────────────────────────

public record SavedListDto(
    Guid Id,
    string Name,
    bool IsPublic,
    DateTime CreatedAt,
    int DealCount
);

public record CreateSavedListRequest(
    string Name,
    bool IsPublic = false
);

public record UpdateSavedListRequest(
    string? Name = null,
    bool? IsPublic = null
);

// ─── Saved Deal DTOs ─────────────────────────────────────────────────────────

public record SavedDealDto(
    Guid Id,
    Guid DealId,
    Guid ListId,
    string ListName,
    DateTime SavedAt,
    SavedDeal_DealSummary Deal
);

/// <summary>Embedded deal summary inside SavedDealDto.</summary>
public record SavedDeal_DealSummary(
    string Id,
    string Title,
    string Category,
    decimal GroupPrice,
    decimal OriginalPrice,
    string? ImageUrl,
    int MembersJoined,
    int MinMembers,
    string Status,
    string OrganizerName,
    string? OrganizerAvatar,
    double? Latitude,
    double? Longitude,
    DateTime Deadline
);

public record SaveDealRequest(
    Guid DealId,
    Guid? ListId = null,
    string? NewListName = null   // create & save to a new list in one shot
);

public record UnsaveDealRequest(
    Guid DealId,
    Guid ListId
);
