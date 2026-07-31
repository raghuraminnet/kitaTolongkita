using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using KitaTolongKita.Admin.Api.Data;
using KitaTolongKita.Admin.Api.DTOs;
using KitaTolongKita.Admin.Api.Entities;

namespace KitaTolongKita.Admin.Api.Services;

public interface IAdminService
{
    // Admin Users
    Task<AdminUser> CreateAdminUserAsync(string email, string password, string fullName, string role);
    Task<List<AdminUserItem>> GetAdminUsersAsync();
    Task<bool> DeleteAdminUserAsync(int id, int actorId);

    // Users (main DB)
    Task<PagedResult<UserListItem>> GetUsersAsync(string? search, string? filter, int page, int pageSize);
    Task<UserDetail?> GetUserDetailAsync(string id);
    Task<bool> ToggleUserStatusAsync(string id, bool isActive, int adminId);

    // Deals (main DB)
    Task<PagedResult<DealModerationItem>> GetPendingDealsAsync(int page, int pageSize);
    Task<PagedResult<DealListItem>> GetAllDealsAsync(string? status, string? search, int page, int pageSize);
    Task<bool> ApproveDealAsync(string id, int adminId);
    Task<bool> RejectDealAsync(string id, string reason, int adminId);
    Task<bool> FeatureDealAsync(string id, bool featured, int adminId);

    // Orders (main DB)
    Task<PagedResult<OrderListItem>> GetOrdersAsync(string? status, string? search, int page, int pageSize);
    Task<OrderDetail?> GetOrderDetailAsync(string id);
    Task<bool> UpdateOrderStatusAsync(string id, string status, int adminId);

    // AI Configs
    Task<List<AiConfigItem>> GetAiConfigsAsync();
    Task<AiConfigItem?> CreateAiConfigAsync(CreateAiConfigRequest req, int adminId);
    Task<AiConfigItem?> UpdateAiConfigAsync(int id, UpdateAiConfigRequest req, int adminId);
    Task<bool> DeleteAiConfigAsync(int id, int adminId);
    Task<AiConfigItem?> GetActiveAiConfigAsync();

    // Moderation Rules
    Task<List<ModerationRuleItem>> GetModerationRulesAsync(string? category);
    Task<ModerationRuleItem?> UpdateModerationRuleAsync(int id, UpdateModerationRuleRequest req, int adminId);

    // Settings
    Task<List<SettingItem>> GetSettingsAsync();
    Task<bool> UpdateSettingAsync(UpdateSettingRequest req, int adminId);
}

public class AdminService : IAdminService
{
    private readonly AdminDbContext _db;
    private readonly MainDbContext _mainDb;
    private readonly IConfigSyncService _configSync;
    private readonly ILogger<AdminService> _logger;

    public AdminService(
        AdminDbContext db, MainDbContext mainDb,
        IConfigSyncService configSync, ILogger<AdminService> logger)
    {
        _db = db;
        _mainDb = mainDb;
        _configSync = configSync;
        _logger = logger;
    }

    // ── Audit helper ─────────────────────────────────────────────────────────
    private async Task LogActionAsync(int adminId, string adminEmail, string action, string entityType, string entityId, string? details = null)
    {
        var admin = await _db.AdminUsers.FindAsync(adminId);
        _db.AuditLogs.Add(new AuditLog
        {
            AdminUserId = adminId,
            AdminEmail = admin?.Email ?? adminEmail,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Details = details,
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
    }

    private string MaskApiKey(string? key) =>
        string.IsNullOrWhiteSpace(key) || key.Length < 8
            ? "****"
            : $"{key[..4]}...{key[^4..]}";

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

    public async Task<List<AdminUserItem>> GetAdminUsersAsync()
    {
        var users = await _db.AdminUsers.AsNoTracking().OrderBy(x => x.CreatedAt).ToListAsync();
        return users.Select(u => new AdminUserItem(
            u.Id, u.Email, u.FullName, u.Role, u.IsActive, u.LastLoginAt, u.CreatedAt)).ToList();
    }

    public async Task<bool> DeleteAdminUserAsync(int id, int actorId)
    {
        var actor = await _db.AdminUsers.FindAsync(actorId);
        if (actor?.Role != "SuperAdmin") return false;
        if (id == 1) return false; // Can't delete default admin

        var user = await _db.AdminUsers.FindAsync(id);
        if (user == null) return false;

        _db.AdminUsers.Remove(user);
        await _db.SaveChangesAsync();
        await LogActionAsync(actorId, actor.Email, "DELETED_ADMIN_USER", "AdminUser", id.ToString(), $"Deleted {user.Email}");
        return true;
    }

    // ── Users ────────────────────────────────────────────────────────────────
    public async Task<PagedResult<UserListItem>> GetUsersAsync(string? search, string? filter, int page, int pageSize)
    {
        var query = _mainDb.Users.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(u => u.Email.Contains(search) || u.FullName.Contains(search));
        if (filter == "verified") query = query.Where(u => u.EmailVerified);
        else if (filter == "unverified") query = query.Where(u => !u.EmailVerified);

        var total = await query.CountAsync();
        var users = await query.OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        var items = new List<UserListItem>();
        foreach (var u in users)
        {
            var dealsPosted = await _mainDb.Deals.CountAsync(d => d.OrganizerId == u.Id);
            items.Add(new UserListItem(
                u.Id.ToString(), u.Email, u.FullName, u.AvatarUrl,
                u.EmailVerified, u.IsActive, u.CreatedAt, dealsPosted, 0));
        }
        return new PagedResult<UserListItem>(items, total, page, pageSize, (int)Math.Ceiling(total / (double)pageSize));
    }

    public async Task<UserDetail?> GetUserDetailAsync(string id)
    {
        if (!Guid.TryParse(id, out var uid)) return null;
        var user = await _mainDb.Users.Include(u => u.OrganizedDeals)
            .Include(u => u.Orders).ThenInclude(o => o.Deal).AsNoTracking().FirstOrDefaultAsync(u => u.Id == uid);
        if (user == null) return null;

        return new UserDetail(
            user.Id.ToString(), user.Email, user.FullName, user.AvatarUrl,
            user.EmailVerified, user.IsActive, user.CreatedAt, user.LastLoginAt,
            user.OrganizedDeals.Select(d => new DealSummary(d.Id.ToString(), d.Title, d.ModerationStatus, d.CreatedAt)).ToList(),
            user.Orders.Select(o => new OrderSummary(o.Id.ToString(), o.Deal?.Title ?? "", o.Status, o.TotalPrice, o.CreatedAt)).ToList());
    }

    public async Task<bool> ToggleUserStatusAsync(string id, bool isActive, int adminId)
    {
        if (!Guid.TryParse(id, out var uid)) return false;
        var user = await _mainDb.Users.FindAsync(uid);
        if (user == null) return false;
        user.EmailVerified = isActive;
        await _mainDb.SaveChangesAsync();
        var admin = await _db.AdminUsers.FindAsync(adminId);
        await LogActionAsync(adminId, admin!.Email, isActive ? "ENABLED_USER" : "DISABLED_USER", "User", id);
        return true;
    }

    // ── Deals ────────────────────────────────────────────────────────────────
    public async Task<PagedResult<DealModerationItem>> GetPendingDealsAsync(int page, int pageSize)
    {
        var q = _mainDb.Deals.Include(d => d.Organizer)
            .Where(d => d.ModerationStatus == "UnderReview" || d.ModerationStatus == "PendingReview" || d.ModerationStatus == "Pending")
            .AsNoTracking();
        var total = await q.CountAsync();
        var deals = await q.OrderByDescending(d => d.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        var items = deals.Select(d => new DealModerationItem(
            d.Id.ToString(), d.Title, d.Category, d.Organizer?.FullName ?? "", d.Organizer?.Email ?? "",
            d.GroupPrice, d.OriginalPrice, d.MinMembers, d.MembersJoined,
            d.ModerationStatus, d.ModerationScore, d.ModerationRejectReason,
            d.ImageUrls, d.Hashtags?.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList() ?? new List<string>(), d.CreatedAt, d.Deadline)).ToList();
        return new PagedResult<DealModerationItem>(items, total, page, pageSize, (int)Math.Ceiling(total / (double)pageSize));
    }

    public async Task<PagedResult<DealListItem>> GetAllDealsAsync(string? status, string? search, int page, int pageSize)
    {
        var q = _mainDb.Deals.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(d => d.Title.Contains(search!) || d.Category.Contains(search!));
        if (!string.IsNullOrWhiteSpace(status) && status != "All")
            q = q.Where(d => d.ModerationStatus == status);
        var total = await q.CountAsync();
        var deals = await q.OrderByDescending(d => d.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        var items = deals.Select(d => new DealListItem(
            d.Id.ToString(), d.Title, d.Category, d.Organizer?.FullName ?? "",
            d.GroupPrice, d.MembersJoined, d.MinMembers, d.ModerationStatus, d.IsFeatured, d.CreatedAt)).ToList();
        return new PagedResult<DealListItem>(items, total, page, pageSize, (int)Math.Ceiling(total / (double)pageSize));
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
        await _configSync.PublishConfigChangeAsync("config:changed", new { key = "deal:approved", value = id });
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
        await LogActionAsync(adminId, admin!.Email, featured ? "FEATURED_DEAL" : "UNFEATURED_DEAL", "Deal", id);
        return true;
    }

    // ── Orders ───────────────────────────────────────────────────────────────
    public async Task<PagedResult<OrderListItem>> GetOrdersAsync(string? status, string? search, int page, int pageSize)
    {
        var q = _mainDb.Orders.Include(o => o.User).Include(o => o.Deal).AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status))
            q = q.Where(o => o.Status == status!);
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(o => o.User!.Email.Contains(search!) || o.Deal!.Title.Contains(search!));
        var total = await q.CountAsync();
        var orders = await q.OrderByDescending(o => o.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        var items = orders.Select(o => new OrderListItem(
            o.Id.ToString(), o.User?.FullName ?? "", o.User?.Email ?? "",
            o.Deal?.Title ?? "", o.Status, o.TotalPrice, o.Quantity, o.CreatedAt)).ToList();
        return new PagedResult<OrderListItem>(items, total, page, pageSize, (int)Math.Ceiling(total / (double)pageSize));
    }

    public async Task<OrderDetail?> GetOrderDetailAsync(string id)
    {
        if (!Guid.TryParse(id, out var oid)) return null;
        var order = await _mainDb.Orders.Include(o => o.User).Include(o => o.Deal).AsNoTracking().FirstOrDefaultAsync(o => o.Id == oid);
        if (order == null) return null;
        return new OrderDetail(order.Id.ToString(), order.User?.FullName ?? "", order.User?.Email ?? "", null, "",
            order.Deal?.Title ?? "", order.Status, order.TotalPrice, order.Quantity, order.CreatedAt, order.UpdatedAt);
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
        await LogActionAsync(adminId, admin!.Email, $"UPDATE_ORDER_STATUS_{status.ToUpper()}", "Order", id);
        return true;
    }

    // ── AI Configs ───────────────────────────────────────────────────────────
    public async Task<List<AiConfigItem>> GetAiConfigsAsync()
    {
        return await _db.AiConfigs.AsNoTracking().OrderBy(x => x.Name)
            .Select(x => new AiConfigItem(
                x.Id, x.Name, x.Provider, MaskApiKey(x.ApiKey),
                x.Endpoint, x.BaseUrl, x.DeploymentName, x.ModelName,
                x.IsActive, x.CreatedAt, x.UpdatedAt)).ToListAsync();
    }

    public async Task<AiConfigItem?> CreateAiConfigAsync(CreateAiConfigRequest req, int adminId)
    {
        var existing = await _db.AiConfigs.FirstOrDefaultAsync(x => x.Name == req.Name);
        if (existing != null) return null;

        var config = new AiConfig
        {
            Name = req.Name,
            Provider = req.Provider,
            ApiKey = req.ApiKey,
            Endpoint = req.Endpoint,
            BaseUrl = req.BaseUrl,
            DeploymentName = req.DeploymentName,
            ModelName = req.ModelName,
            IsActive = false, // New configs default inactive
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedByAdminId = adminId
        };
        _db.AiConfigs.Add(config);
        await _db.SaveChangesAsync();

        // If this is the first config, make it active
        var count = await _db.AiConfigs.CountAsync();
        if (count == 1) { config.IsActive = true; await _db.SaveChangesAsync(); }

        // Sync active AI config to Redis for main API to pick up
        if (config.IsActive)
        {
            await _configSync.SetConfigAsync("ai:active_provider", config.Provider);
            await _configSync.SetConfigAsync("ai:active_config_id", config.Id.ToString());
            await _configSync.PublishAiConfigAsync(config);
        }

        await LogActionAsync(adminId, (await _db.AdminUsers.FindAsync(adminId))!.Email,
            "CREATED_AI_CONFIG", "AiConfig", config.Id.ToString(), $"Created {config.Name} ({config.Provider})");
        return new AiConfigItem(config.Id, config.Name, config.Provider, MaskApiKey(config.ApiKey),
            config.Endpoint, config.BaseUrl, config.DeploymentName, config.ModelName, config.IsActive, config.CreatedAt, config.UpdatedAt);
    }

    public async Task<AiConfigItem?> UpdateAiConfigAsync(int id, UpdateAiConfigRequest req, int adminId)
    {
        var config = await _db.AiConfigs.FindAsync(id);
        if (config == null) return null;

        if (req.Name != null) config.Name = req.Name;
        if (req.Provider != null) config.Provider = req.Provider;
        if (req.ApiKey != null) config.ApiKey = req.ApiKey;
        if (req.Endpoint != null) config.Endpoint = req.Endpoint;
        if (req.BaseUrl != null) config.BaseUrl = req.BaseUrl;
        if (req.DeploymentName != null) config.DeploymentName = req.DeploymentName;
        if (req.ModelName != null) config.ModelName = req.ModelName;

        // If setting active, deactivate all others first
        if (req.IsActive == true)
        {
            var others = await _db.AiConfigs.Where(x => x.Id != id).ToListAsync();
            others.ForEach(x => x.IsActive = false);
        }
        if (req.IsActive.HasValue) config.IsActive = req.IsActive.Value;

        config.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var admin = await _db.AdminUsers.FindAsync(adminId);
        await LogActionAsync(adminId, admin!.Email, "UPDATED_AI_CONFIG", "AiConfig", config.Id.ToString(),
            $"Updated {config.Name}");

        // Publish config change to Redis
        await _configSync.SetConfigAsync("ai:active_provider", config.Provider);
        await _configSync.SetConfigAsync("ai:active_config_id", config.Id.ToString());
        if (config.IsActive)
            await _configSync.PublishAiConfigAsync(config);

        return new AiConfigItem(config.Id, config.Name, config.Provider, MaskApiKey(config.ApiKey),
            config.Endpoint, config.BaseUrl, config.DeploymentName, config.ModelName, config.IsActive, config.CreatedAt, config.UpdatedAt);
    }

    public async Task<bool> DeleteAiConfigAsync(int id, int adminId)
    {
        if (id == 1) return false; // Can't delete seeded default
        var config = await _db.AiConfigs.FindAsync(id);
        if (config == null) return false;
        _db.AiConfigs.Remove(config);
        await _db.SaveChangesAsync();
        var admin = await _db.AdminUsers.FindAsync(adminId);
        await LogActionAsync(adminId, admin!.Email, "DELETED_AI_CONFIG", "AiConfig", id.ToString(), $"Deleted {config.Name}");
        return true;
    }

    public async Task<AiConfigItem?> GetActiveAiConfigAsync()
    {
        var config = await _db.AiConfigs.FirstOrDefaultAsync(x => x.IsActive);
        if (config == null) return null;
        return new AiConfigItem(config.Id, config.Name, config.Provider, MaskApiKey(config.ApiKey),
            config.Endpoint, config.BaseUrl, config.DeploymentName, config.ModelName, config.IsActive, config.CreatedAt, config.UpdatedAt);
    }

    // ── Moderation Rules ────────────────────────────────────────────────────
    public async Task<List<ModerationRuleItem>> GetModerationRulesAsync(string? category)
    {
        var q = _db.ModerationRules.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(category)) q = q.Where(r => r.Category == category);
        return await q.OrderBy(r => r.Category).ThenBy(r => r.Key)
            .Select(r => new ModerationRuleItem(
                r.Id, r.Key, r.Value, r.Description, r.Category, r.IsActive, r.UpdatedAt)).ToListAsync();
    }

    public async Task<ModerationRuleItem?> UpdateModerationRuleAsync(int id, UpdateModerationRuleRequest req, int adminId)
    {
        var rule = await _db.ModerationRules.FindAsync(id);
        if (rule == null) return null;

        if (req.Value != null) rule.Value = req.Value;
        if (req.IsActive.HasValue) rule.IsActive = req.IsActive.Value;
        rule.UpdatedAt = DateTime.UtcNow;
        rule.UpdatedByAdminId = adminId;
        await _db.SaveChangesAsync();

        var admin = await _db.AdminUsers.FindAsync(adminId);
        await LogActionAsync(adminId, admin!.Email, "UPDATED_MODERATION_RULE", "ModerationRule", rule.Id.ToString(),
            $"{rule.Key} = {rule.Value} (active={rule.IsActive})");

        // Publish to Redis so app API can reload
        await _configSync.SetConfigAsync($"rule:{rule.Key}", rule.Value);

        return new ModerationRuleItem(
            rule.Id, rule.Key, rule.Value, rule.Description, rule.Category, rule.IsActive, rule.UpdatedAt);
    }

    // ── Settings ─────────────────────────────────────────────────────────────
    public async Task<List<SettingItem>> GetSettingsAsync()
    {
        return await _db.AppSettings.AsNoTracking().OrderBy(x => x.Key)
            .Select(x => new SettingItem(x.Key, x.Value, x.Description)).ToListAsync();
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

        // Sync to Redis
        await _configSync.SetConfigAsync($"setting:{req.Key}", req.Value);

        return true;
    }
}
