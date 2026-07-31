using Microsoft.EntityFrameworkCore;
using KitaTolongKita.Admin.Api.Data;
using KitaTolongKita.Admin.Api.DTOs;

namespace KitaTolongKita.Admin.Api.Services;

public interface IMainDbService
{
    Task<List<AppDealItem>> GetDealsAsync(string? status = null, string? search = null);
    Task<AppDealItem?> GetDealByIdAsync(Guid id);
    Task<List<AppUserItem>> GetUsersAsync(string? search = null);
    Task<AppUserItem?> GetUserByIdAsync(Guid id);
    Task<int> GetUserCountAsync();
    Task<int> GetDealCountAsync(string? status = null);
}

public class MainDbService : IMainDbService
{
    private readonly MainDbContext _db;

    public MainDbService(MainDbContext db) => _db = db;

    public async Task<List<AppDealItem>> GetDealsAsync(string? status = null, string? search = null)
    {
        var query = _db.Deals.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && status != "All")
            query = query.Where(d => d.Status == status);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(d =>
                d.Title.Contains(search) ||
                d.Description.Contains(search) ||
                d.Category.Contains(search));

        var deals = await query
            .OrderByDescending(d => d.CreatedAt)
            .Take(200)
            .ToListAsync();

        return deals.Select(d => new AppDealItem(
            d.Id, d.Title, d.Description, d.Category,
            d.OriginalPrice, d.GroupPrice,
            d.MinMembers, d.MaxMembers, d.MembersJoined,
            d.Deadline, d.PickupLocation, d.ImageUrl,
            d.Status, d.ModerationStatus, d.ModerationScore, d.ModerationRejectReason,
            d.UpvoteCount, d.LikeCount,
            d.OrganizerId, d.CreatedAt, d.PublishedAt
        )).ToList();
    }

    public async Task<AppDealItem?> GetDealByIdAsync(Guid id)
    {
        var d = await _db.Deals.AsNoTracking().FirstOrDefaultAsync(d => d.Id == id);
        if (d == null) return null;
        return new AppDealItem(
            d.Id, d.Title, d.Description, d.Category,
            d.OriginalPrice, d.GroupPrice,
            d.MinMembers, d.MaxMembers, d.MembersJoined,
            d.Deadline, d.PickupLocation, d.ImageUrl,
            d.Status, d.ModerationStatus, d.ModerationScore, d.ModerationRejectReason,
            d.UpvoteCount, d.LikeCount,
            d.OrganizerId, d.CreatedAt, d.PublishedAt
        );
    }

    public async Task<List<AppUserItem>> GetUsersAsync(string? search = null)
    {
        var query = _db.Users.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(u =>
                u.Email.Contains(search) ||
                u.FullName.Contains(search));

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Take(200)
            .ToListAsync();

        return users.Select(u => new AppUserItem(
            u.Id, u.Email, u.FullName, u.Phone, u.AvatarUrl,
            u.EmailVerified, u.CreatedAt, u.LastLoginAt, u.IsActive
        )).ToList();
    }

    public async Task<AppUserItem?> GetUserByIdAsync(Guid id)
    {
        var u = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id);
        if (u == null) return null;
        return new AppUserItem(
            u.Id, u.Email, u.FullName, u.Phone, u.AvatarUrl,
            u.EmailVerified, u.CreatedAt, u.LastLoginAt, u.IsActive
        );
    }

    public async Task<int> GetUserCountAsync()
        => await _db.Users.AsNoTracking().CountAsync();

    public async Task<int> GetDealCountAsync(string? status = null)
    {
        var query = _db.Deals.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status) && status != "All")
            return await query.CountAsync(d => d.Status == status);
        return await query.CountAsync();
    }
}
