using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using KitaTolongKita.Core.DTOs;

namespace KitaTolongKita.Core.Interfaces;

public interface ISavedDealService
{
    /// <summary>Save a deal to a list. Creates the default "Favorites" list on first save if needed.</summary>
    Task<SavedDealDto> SaveDealAsync(Guid userId, Guid dealId, Guid? listId = null, string? newListName = null);

    /// <summary>Remove a saved deal from a list.</summary>
    Task<bool> UnsaveDealAsync(Guid userId, Guid dealId, Guid listId);

    /// <summary>Get all the user's saved lists with deal counts.</summary>
    Task<List<SavedListDto>> GetMyListsAsync(Guid userId);

    /// <summary>Get all deals saved by a user (optionally filtered by list).</summary>
    Task<List<SavedDealDto>> GetSavedDealsAsync(Guid userId, Guid? listId = null);

    /// <summary>Create a new saved list for a user.</summary>
    Task<SavedListDto> CreateListAsync(Guid userId, string name, bool isPublic = false);

    /// <summary>Delete a saved list and all its saved deals.</summary>
    Task<bool> DeleteListAsync(Guid userId, Guid listId);

    /// <summary>Update a list's name or visibility.</summary>
    Task<SavedListDto?> UpdateListAsync(Guid userId, Guid listId, string? name = null, bool? isPublic = null);

    /// <summary>Check if a deal is saved by the current user, and which lists.</summary>
    Task<List<Guid>> GetSavedListIdsAsync(Guid userId, Guid dealId);

    /// <summary>Batch check saved state for multiple deals. Returns dealId → listIds map.</summary>
    Task<Dictionary<Guid, List<Guid>>> GetSavedStateBatchAsync(Guid userId, IEnumerable<Guid> dealIds);
}
