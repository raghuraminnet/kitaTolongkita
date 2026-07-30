using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using KitaTolongKita.Admin.Api.Data;
using KitaTolongKita.Admin.Api.DTOs;
using KitaTolongKita.Admin.Api.Entities;

namespace KitaTolongKita.Admin.Api.Services;

public interface IAdminService
{
    Task<AdminUser> CreateAdminUserAsync(string email, string password, string fullName, string role);
    Task<PagedResult<UserListItem>> GetUsersAsync(string? search, string? filter, int page, int pageSize);
    Task<UserDetail?> GetUserDetailAsync(string id);
    Task<bool> ToggleUserStatusAsync(string id, bool isActive, int adminId);
    Task<PagedResult<DealModerationItem>> GetPendingDealsAsync(int page, int pageSize);
    Task<PagedResult<DealListItem>> GetAllDealsAsync(string? status, string? search, int page, int pageSize);
    Task<bool> ApproveDealAsync(string id, int adminId);
    Task<bool> RejectDealAsync(string id, string reason, int adminId);
    Task<bool> FeatureDealAsync(string id, bool featured, int adminId);
    Task<PagedResult<OrderListItem>> GetOrdersAsync(string? status, string? search, int page, int pageSize);
    Task<OrderDetail?> GetOrderDetailAsync(string id);
    Task<bool> UpdateOrderStatusAsync(string id, string status, int adminId);
    Task<List<SettingItem>> GetSettingsAsync();
    Task<bool> UpdateSettingAsync(UpdateSettingRequest req, int adminId);
}

public class AdminService : IAdminService
{
    private readonly AdminDbContext _db;
    private readonly MainDbContext _mainDb;
    private readonly ILogger<AdminService> _logger;

    public AdminService(AdminDbContext db, MainDbContext mainDb, ILogger<AdminService> logger)
    {
        _db = db;
        _mainDb = mainDb;
        _logger = logger;
    }

    // ── Audit helper ──────────────────────────────────────────────────────────
    private async Task LogActionAsync(int adminId, string adminEmail, string action, string entityType, string entityId, string? details = null)
    {
        _db.AuditLogs.Add(new AuditLog
        {
            AdminUserId = adminId,
            AdminEmail = adminEmail,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Details = details,
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
    }

    // ── Admin Users ──────────────────────────────────────────────────────────
    public async Task<AdminUser> CreateAdminUserAsync(string email, string password, string fullName, string role)
    {
        var user = new AdminUser
        {
            Email = email,
            FullName = fullName,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Role = role,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _db.AdminUsers.Add(user);
        await _db.SaveChangesAsync();
        return user;
    }

    // ── Users ────────────────────────────────────────────────────────────────
    public async Task<PagedResult<UserListItem>> GetUsersAsync(string? search, string? filter, int page, int pageSize)
    {
        var query = _mainDb.Users.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(u => u.Email.Contains(search) || u.FullName.Contains(search));

        if (filter == "verified")
            query = query.Where(u => u.EmailVerified);
        else if (filter == "unverified")
            query = query.Where(u => !u.EmailVerified);

        var total = await query.CountAsync();
        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var items = new List<UserListItem>();
        foreach (var u in users)
        {
            var dealsPosted = await _mainDb.Deals.CountAsync(d => d.OrganizerId == u.Id);
            items.Add(new UserListItem(
                u.Id.ToString(), u.Email, u.FullName, u.AvatarUrl,
                u.EmailVerified, u.EmailVerified, u.CreatedAt, dealsPosted, 0
            ));
        }

        return new PagedResult<UserListItem>(items, total, page, pageSize,
            (int)Math.Ceiling(total / (double)pageSize));
    }

    public async Task<UserDetail?> GetUserDetailAsync(string id)
    {
        if (!Guid.TryParse(id, out var uid)) return null;
        var user = await _mainDb.Users
            .Include(u => u.OrganizedDeals)
            .Include(u => u.Orders).ThenInclude(o => o.Deal)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == uid);
        if (user == null) return null;

        var deals = user.OrganizedDeals.Select(d =>
            new DealSummary(d.Id.ToString(), d.Title, d.ModerationStatus, d.CreatedAt)).ToList();
        var orders = user.Orders.Select(o =>
            new OrderSummary(o.Id.ToString(), o.Deal?.Title ?? "", o.Status, o.Amount, o.CreatedAt)).ToList();

        return new UserDetail(
            user.Id.ToString(), user.Email, user.FullName, user.AvatarUrl,
            user.EmailVerified, user.EmailVerified, user.CreatedAt, user.LastLoginAt,
            deals, orders
        );
    }

    public async Task<bool> ToggleUserStatusAsync(string id, bool isActive, int adminId)
    {
        if (!Guid.TryParse(id, out var uid)) return false;
        var user = await _mainDb.Users.FindAsync(uid);
        if (user == null) return false;

        user.EmailVerified = isActive;
        await _mainDb.SaveChangesAsync();

        var admin = await _db.AdminUsers.FindAsync(adminId);
        await LogActionAsync(adminId, admin!.Email,
            isActive ? "ENABLED_USER" : "DISABLED_USER", "User", id);
        return true;
    }

    // ── Deals ────────────────────────────────────────────────────────────────
    public async Task<PagedResult<DealModerationItem>> GetPendingDealsAsync(int page, int pageSize)
    {
        var query = _mainDb.Deals
            .Include(d => d.Organizer)
            .Where(d => d.ModerationStatus == "UnderReview" || d.ModerationStatus == "PendingReview" || d.ModerationStatus == "Pending")
            .AsNoTracking();

        var total = await query.CountAsync();
        var deals = await query
            .OrderByDescending(d => d.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var items = deals.Select(d => new DealModerationItem(
            d.Id.ToString(), d.Title, d.Category,
            d.Organizer?.FullName ?? "", d.Organizer?.Email ?? "",
            d.GroupPrice, d.OriginalPrice, d.MinGroup, d.CurrentGroup,
            d.ModerationStatus, d.ModerationScore, d.ModerationRejectReason,
            d.ImageUrls, d.Hashtags, d.CreatedAt, d.Deadline
        )).ToList();

        return new PagedResult<DealModerationItem>(items, total, page, pageSize,
            (int)Math.Ceiling(total / (double)pageSize));
    }

    public async Task<PagedResult<DealListItem>> GetAllDealsAsync(string? status, string? search, int page, int pageSize)
    {
        var query = _mainDb.Deals.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(d => d.Title.Contains(search) || d.Category.Contains(search));
        if (!string.IsNullOrWhiteSpace(status) && status != "All")
            query = query.Where(d => d.ModerationStatus == status);

        var total = await query.CountAsync();
        var deals = await query
            .OrderByDescending(d => d.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var items = deals.Select(d => new DealListItem(
            d.Id.ToString(), d.Title, d.Category, d.Organizer?.FullName ?? "",
            d.GroupPrice, d.CurrentGroup, d.MinGroup,
            d.ModerationStatus, d.IsFeatured, d.CreatedAt
        )).ToList();

        return new PagedResult<DealListItem>(items, total, page, pageSize,
            (int)Math.Ceiling(total / (double)pageSize));
    }

    public async Task<bool> ApproveDealAsync(string id, int adminId)
    {
        if (!Guid.TryParse(id, out var gid)) return false;
        var deal = await _mainDb.Deals.FindAsync(gid);
        if (deal == null) return false;

        deal.ModerationStatus = "Approved";
        deal.ModerationRejectReason = null;
        await _mainDb.SaveChangesAsync();

        var admin = await _db.AdminUsers.FindAsync(adminId);
        await LogActionAsync(adminId, admin!.Email, "APPROVED_DEAL", "Deal", id);
        return true;
    }

    public async Task<bool> RejectDealAsync(string id, string reason, int adminId)
    {
        if (!Guid.TryParse(id, out var gid)) return false;
        var deal = await _mainDb.Deals.FindAsync(gid);
        if (deal == null) return false;

        deal.ModerationStatus = "Rejected";
        deal.ModerationRejectReason = reason;
        await _mainDb.SaveChangesAsync();

        var admin = await _db.AdminUsers.FindAsync(adminId);
        await LogActionAsync(adminId, admin!.Email, "REJECTED_DEAL", "Deal", id, reason);
        return true;
    }

    public async Task<bool> FeatureDealAsync(string id, bool featured, int adminId)
    {
        if (!Guid.TryParse(id, out var gid)) return false;
        var deal = await _mainDb.Deals.FindAsync(gid);
        if (deal == null) return false;

        deal.IsFeatured = featured;
        await _mainDb.SaveChangesAsync();

        var admin = await _db.AdminUsers.FindAsync(adminId);
        await LogActionAsync(adminId, admin!.Email,
            featured ? "FEATURED_DEAL" : "UNFEATURED_DEAL", "Deal", id);
        return true;
    }

    // ── Orders ───────────────────────────────────────────────────────────────
    public async Task<PagedResult<OrderListItem>> GetOrdersAsync(string? status, string? search, int page, int pageSize)
    {
        var query = _mainDb.Orders
            .Include(o => o.User)
            .Include(o => o.Deal)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(o => o.Status == status);
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(o => o.User!.Email.Contains(search) || o.Deal!.Title.Contains(search));

        var total = await query.CountAsync();
        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var items = orders.Select(o => new OrderListItem(
            o.Id.ToString(),
            o.User?.FullName ?? "", o.User?.Email ?? "",
            o.Deal?.Title ?? "", o.Status,
            o.Amount, o.Quantity, o.CreatedAt
        )).ToList();

        return new PagedResult<OrderListItem>(items, total, page, pageSize,
            (int)Math.Ceiling(total / (double)pageSize));
    }

    public async Task<OrderDetail?> GetOrderDetailAsync(string id)
    {
        if (!Guid.TryParse(id, out var oid)) return null;
        var order = await _mainDb.Orders
            .Include(o => o.User)
            .Include(o => o.Deal)
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == oid);
        if (order == null) return null;

        return new OrderDetail(
            order.Id.ToString(),
            order.User?.FullName ?? "", order.User?.Email ?? "", null,
            "",
            order.Deal?.Title ?? "", order.Status,
            order.Amount, order.Quantity, order.CreatedAt, order.UpdatedAt
        );
    }

    public async Task<bool> UpdateOrderStatusAsync(string id, string status, int adminId)
    {
        if (!Guid.TryParse(id, out var oid)) return false;
        var order = await _mainDb.Orders.FindAsync(oid);
        if (order == null) return false;

        order.Status = status;
        order.UpdatedAt = DateTime.UtcNow;
        await _mainDb.SaveChangesAsync();

        var admin = await _db.AdminUsers.FindAsync(adminId);
        await LogActionAsync(adminId, admin!.Email,
            $"UPDATE_ORDER_STATUS_{status.ToUpper()}", "Order", id);
        return true;
    }

    // ── Settings ─────────────────────────────────────────────────────────────
    public async Task<List<SettingItem>> GetSettingsAsync()
    {
        return await _db.AppSettings
            .OrderBy(x => x.Key)
            .Select(x => new SettingItem(x.Key, x.Value, null))
            .ToListAsync();
    }

    public async Task<bool> UpdateSettingAsync(UpdateSettingRequest req, int adminId)
    {
        var setting = await _db.AppSettings.FirstOrDefaultAsync(x => x.Key == req.Key);
        if (setting == null) return false;

        setting.Value = req.Value;
        setting.UpdatedAt = DateTime.UtcNow;
        setting.UpdatedByAdminId = adminId;
        await _db.SaveChangesAsync();

        var admin = await _db.AdminUsers.FindAsync(adminId);
        await LogActionAsync(adminId, admin!.Email, "UPDATED_SETTING", "Setting", req.Key, $"{req.Key} = {req.Value}");

        return true;
    }
}
