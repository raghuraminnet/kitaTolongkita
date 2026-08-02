using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using KitaTolongKita.Core.DTOs;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Core.Interfaces;
using KitaTolongKita.Infrastructure.Data;

namespace KitaTolongKita.Infrastructure.Services;

public class SavedDealService : ISavedDealService
{
    private readonly AppDbContext _db;
    private const int MaxListsPerUser = 20;
    private const int MaxNameLength = 30;

    public SavedDealService(AppDbContext db) => _db = db;

    public async Task<SavedDealDto> SaveDealAsync(Guid userId, Guid dealId, Guid? listId = null, string? newListName = null)
    {
        // Validate deal exists and is active
        var deal = await _db.Deals.FindAsync(dealId);
        if (deal == null || deal.Status == DealStatus.Hidden)
            throw new InvalidOperationException("Deal not found.");

        SavedList list;

        if (newListName != null)
        {
            // Create new list on the fly
            var trimmedName = newListName.Trim()[..Math.Min(newListName.Trim().Length, MaxNameLength)];
            var existingCount = await _db.SavedLists.CountAsync(l => l.UserId == userId);
            if (existingCount >= MaxListsPerUser)
                throw new InvalidOperationException($"Maximum of {MaxListsPerUser} lists allowed.");

            list = new SavedList { UserId = userId, Name = trimmedName, IsPublic = false };
            _db.SavedLists.Add(list);
            await _db.SaveChangesAsync();
        }
        else if (listId.HasValue)
        {
            list = await _db.SavedLists.FirstOrDefaultAsync(l => l.Id == listId.Value && l.UserId == userId)
                ?? throw new InvalidOperationException("List not found.");
        }
        else
        {
            // Use or create default "Favorites" list
            list = await _db.SavedLists.FirstOrDefaultAsync(l => l.UserId == userId && l.Name == "Favorites");
            if (list == null)
            {
                list = new SavedList { UserId = userId, Name = "Favorites", IsPublic = false };
                _db.SavedLists.Add(list);
                await _db.SaveChangesAsync();
            }
        }

        // Check duplicate
        var existing = await _db.SavedDeals
            .AnyAsync(s => s.UserId == userId && s.DealId == dealId && s.ListId == list.Id);
        if (existing)
            throw new InvalidOperationException("Deal is already saved to this list.");

        var saved = new SavedDeal { UserId = userId, DealId = dealId, ListId = list.Id };
        _db.SavedDeals.Add(saved);
        await _db.SaveChangesAsync();

        return ToDto(saved, deal, list.Name);
    }

    public async Task<bool> UnsaveDealAsync(Guid userId, Guid dealId, Guid listId)
    {
        var saved = await _db.SavedDeals
            .FirstOrDefaultAsync(s => s.UserId == userId && s.DealId == dealId && s.ListId == listId);
        if (saved == null) return false;

        _db.SavedDeals.Remove(saved);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<SavedListDto>> GetMyListsAsync(Guid userId)
    {
        return await _db.SavedLists
            .Where(l => l.UserId == userId)
            .Include(l => l.SavedDeals)
            .Select(l => new SavedListDto(l.Id, l.Name, l.IsPublic, l.CreatedAt, l.SavedDeals.Count))
            .ToListAsync();
    }

    public async Task<List<SavedDealDto>> GetSavedDealsAsync(Guid userId, Guid? listId = null)
    {
        var query = _db.SavedDeals
            .Where(s => s.UserId == userId)
            .Include(s => s.List)
            .Include(s => s.Deal)
            .AsQueryable();

        if (listId.HasValue)
            query = query.Where(s => s.ListId == listId.Value);

        var results = await query
            .OrderByDescending(s => s.SavedAt)
            .ToListAsync();

        return results.Select(r => ToDto(r, r.Deal, r.List.Name)).ToList();
    }

    public async Task<SavedListDto> CreateListAsync(Guid userId, string name, bool isPublic = false)
    {
        var trimmedName = name.Trim()[..Math.Min(name.Trim().Length, MaxNameLength)];

        var existingCount = await _db.SavedLists.CountAsync(l => l.UserId == userId);
        if (existingCount >= MaxListsPerUser)
            throw new InvalidOperationException($"Maximum of {MaxListsPerUser} lists allowed.");

        var exists = await _db.SavedLists.AnyAsync(l => l.UserId == userId && l.Name == trimmedName);
        if (exists)
            throw new InvalidOperationException("A list with this name already exists.");

        var list = new SavedList { UserId = userId, Name = trimmedName, IsPublic = isPublic };
        _db.SavedLists.Add(list);
        await _db.SaveChangesAsync();

        return new SavedListDto(list.Id, list.Name, list.IsPublic, list.CreatedAt, 0);
    }

    public async Task<bool> DeleteListAsync(Guid userId, Guid listId)
    {
        var list = await _db.SavedLists.FirstOrDefaultAsync(l => l.Id == listId && l.UserId == userId);
        if (list == null) return false;

        _db.SavedLists.Remove(list);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<SavedListDto?> UpdateListAsync(Guid userId, Guid listId, string? name = null, bool? isPublic = null)
    {
        var list = await _db.SavedLists.FirstOrDefaultAsync(l => l.Id == listId && l.UserId == userId);
        if (list == null) return null;

        if (name != null)
        {
            var trimmedName = name.Trim()[..Math.Min(name.Trim().Length, MaxNameLength)];
            list.Name = trimmedName;
        }
        if (isPublic.HasValue)
            list.IsPublic = isPublic.Value;

        await _db.SaveChangesAsync();

        var dealCount = await _db.SavedDeals.CountAsync(s => s.ListId == listId);
        return new SavedListDto(list.Id, list.Name, list.IsPublic, list.CreatedAt, dealCount);
    }

    public async Task<List<Guid>> GetSavedListIdsAsync(Guid userId, Guid dealId)
    {
        return await _db.SavedDeals
            .Where(s => s.UserId == userId && s.DealId == dealId)
            .Select(s => s.ListId)
            .ToListAsync();
    }

    public async Task<Dictionary<Guid, List<Guid>>> GetSavedStateBatchAsync(Guid userId, IEnumerable<Guid> dealIds)
    {
        var dealIdList = dealIds.ToList();
        var rows = await _db.SavedDeals
            .Where(s => s.UserId == userId && dealIdList.Contains(s.DealId))
            .ToListAsync();

        return rows
            .GroupBy(s => s.DealId)
            .ToDictionary(g => g.Key, g => g.Select(s => s.ListId).ToList());
    }

    // ─── Mapping helpers ───────────────────────────────────────────────────────

    private static SavedDealDto ToDto(SavedDeal saved, Deal deal, string listName) =>
        new(
            saved.Id,
            saved.DealId,
            saved.ListId,
            listName,
            saved.SavedAt,
            new SavedDeal_DealSummary(
                deal.Id.ToString(),
                deal.Title,
                deal.Category,
                deal.GroupPrice,
                deal.OriginalPrice,
                deal.ImageUrls?.FirstOrDefault(),
                deal.MembersJoined,
                deal.MinMembers,
                deal.Status.ToString(),
                deal.Organizer?.FullName ?? "",
                deal.Organizer?.AvatarUrl,
                deal.Latitude,
                deal.Longitude,
                deal.Deadline
            )
        );
}
