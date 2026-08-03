using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using KitaTolongKita.Admin.Api.Data;
using KitaTolongKita.Admin.Api.DTOs;
using KitaTolongKita.Admin.Api.Entities;

namespace KitaTolongKita.Admin.Api.Services;

/// <summary>
/// All read/write for app data (users, deals, orders, etc.) goes through IMainApiClient
/// which calls the Kita API over HTTP. Admin DB (AdminDbContext) is only for admin-specific
/// tables: AdminUsers, AiConfigs, ModerationRules, AppSettings, AuditLogs, Categories.
/// </summary>
public interface IAdminService
{
    // Admin Users
    Task<AdminUser> CreateAdminUserAsync(string email, string password, string fullName, string role);
    Task<List<AdminUserItem>> GetAdminUsersAsync();
    Task<bool> DeleteAdminUserAsync(int id, int actorId);

    // Users (Kita API)
    Task<PagedResult<UserListItem>> GetUsersAsync(string? search, string? filter, int page, int pageSize);
    Task<UserDetail?> GetUserDetailAsync(string id);
    Task<bool> ToggleUserStatusAsync(string id, bool isActive, int adminId);
    Task<bool> VerifyUserAsync(string id, bool verify, int adminId);

    // Deals (Kita API)
    Task<PagedResult<DealModerationItem>> GetPendingDealsAsync(int page, int pageSize);
    Task<PagedResult<DealListItem>> GetAllDealsAsync(string? status, string? search, int page, int pageSize);
    Task<bool> ApproveDealAsync(string id, int adminId);
    Task<bool> RejectDealAsync(string id, string reason, int adminId);
    Task<bool> FeatureDealAsync(string id, bool featured, int adminId);

    // Orders (Kita API)
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

    // Saved Lists (Kita API)
    Task<PagedResult<SavedListItem>> GetSavedListsAsync(string? search, int page, int pageSize);
    Task<SavedListDetail?> GetSavedListDetailAsync(string id);

    // Notifications (Kita API)
    Task<PagedResult<NotificationItem>> GetNotificationsAsync(string? type, bool? isRead, int page, int pageSize);
    Task<NotificationStats> GetNotificationStatsAsync();

    // Conversations / Chat (Kita API)
    Task<PagedResult<ConversationItem>> GetConversationsAsync(string? search, int page, int pageSize);
    Task<List<ChatMessageItem>> GetChatMessagesAsync(string conversationId, int page, int pageSize);

    // Push Tokens (Kita API)
    Task<PagedResult<PushTokenItem>> GetPushTokensAsync(string? search, int page, int pageSize);

    // Comments (Kita API)
    Task<PagedResult<CommentItem>> GetCommentsAsync(Guid? dealId, Guid? userId, string? status, int page, int size);
    Task<CommentStats> GetCommentStatsAsync();
    Task<bool> HideCommentAsync(Guid id);
    Task<bool> ApproveCommentAsync(Guid id);
    Task<bool> DeleteCommentAsync(Guid id);

    // Follows (Kita API)
    Task<FollowStats> GetFollowStatsAsync(Guid userId);
    Task<PagedResult<FollowerItem>> GetFollowersAsync(Guid userId, int page, int size);
    Task<PagedResult<FollowerItem>> GetFollowingAsync(Guid userId, int page, int size);

    // Contributor Applications (Kita API)
    Task<PagedResult<ContributorApplicationListItem>> GetContributorApplicationsAsync(string? status, int page, int size);
    Task<bool> ReviewContributorApplicationAsync(Guid id, string action, string? reason, int adminId);

    // User Activity (Kita API)
    Task<UserActivityTimeline?> GetUserActivityAsync(string userId);

    // Deal Statistics (Kita API)
    Task<DealStats> GetDealStatsAsync(int days = 30);

    // Bulk Actions (Kita API)
    Task<BulkActionResult> BulkModerateDealsAsync(BulkActionRequest req, int adminId);

    // Categories (admin DB)
    Task<List<CategoryItem>> GetCategoriesAsync();
    Task<CategoryItem?> CreateCategoryAsync(CreateCategoryRequest req, int adminId);
    Task<CategoryItem?> UpdateCategoryAsync(int id, UpdateCategoryRequest req, int adminId);
    Task<bool> DeleteCategoryAsync(int id, int adminId);
}

public class AdminService : IAdminService
{
    private readonly AdminDbContext _db;
    private readonly IMainApiClient _api;
    private readonly IConfigSyncService _configSync;
    private readonly ILogger<AdminService> _logger;

    public AdminService(
        AdminDbContext db,
        IMainApiClient api,
        IConfigSyncService configSync,
        ILogger<AdminService> logger)
    {
        _db = db;
        _api = api;
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

    private static string MaskApiKey(string? key) =>
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

    // ── Users (via Kita API) ─────────────────────────────────────────────────
    public async Task<PagedResult<UserListItem>> GetUsersAsync(string? search, string? filter, int page, int pageSize)
        => await _api.GetUsersAsync(search, filter, page, pageSize);

    public async Task<UserDetail?> GetUserDetailAsync(string id)
        => await _api.GetUserDetailAsync(id);

    public async Task<bool> ToggleUserStatusAsync(string id, bool isActive, int adminId)
    {
        var ok = await _api.ToggleUserStatusAsync(id, isActive, adminId);
        if (ok)
        {
            var admin = await _db.AdminUsers.FindAsync(adminId);
            await LogActionAsync(adminId, admin!.Email, isActive ? "ENABLED_USER" : "DISABLED_USER", "User", id);
        }
        return ok;
    }

    public async Task<bool> VerifyUserAsync(string id, bool verify, int adminId)
    {
        var ok = await _api.VerifyUserAsync(id, verify, adminId);
        if (ok)
        {
            var admin = await _db.AdminUsers.FindAsync(adminId);
            await LogActionAsync(adminId, admin!.Email, verify ? "VERIFIED_USER" : "REVOKED_VERIFICATION", "User", id);
        }
        return ok;
    }

    // ── Deals (via Kita API) ─────────────────────────────────────────────────
    public async Task<PagedResult<DealModerationItem>> GetPendingDealsAsync(int page, int pageSize)
        => await _api.GetPendingDealsAsync(page, pageSize);

    public async Task<PagedResult<DealListItem>> GetAllDealsAsync(string? status, string? search, int page, int pageSize)
        => await _api.GetAllDealsAsync(status, search, page, pageSize);

    public async Task<bool> ApproveDealAsync(string id, int adminId)
    {
        var ok = await _api.ApproveDealAsync(id, adminId);
        if (ok)
        {
            var admin = await _db.AdminUsers.FindAsync(adminId);
            await LogActionAsync(adminId, admin!.Email, "APPROVED_DEAL", "Deal", id);
            await _configSync.PublishConfigChangeAsync("config:changed", new { key = "deal:approved", value = id });
        }
        return ok;
    }

    public async Task<bool> RejectDealAsync(string id, string reason, int adminId)
    {
        var ok = await _api.RejectDealAsync(id, reason, adminId);
        if (ok)
        {
            var admin = await _db.AdminUsers.FindAsync(adminId);
            await LogActionAsync(adminId, admin!.Email, "REJECTED_DEAL", "Deal", id, reason);
        }
        return ok;
    }

    public async Task<bool> FeatureDealAsync(string id, bool featured, int adminId)
    {
        var ok = await _api.FeatureDealAsync(id, featured, adminId);
        if (ok)
        {
            var admin = await _db.AdminUsers.FindAsync(adminId);
            await LogActionAsync(adminId, admin!.Email, featured ? "FEATURED_DEAL" : "UNFEATURED_DEAL", "Deal", id);
        }
        return ok;
    }

    // ── Orders (via Kita API) ────────────────────────────────────────────────
    public async Task<PagedResult<OrderListItem>> GetOrdersAsync(string? status, string? search, int page, int pageSize)
        => await _api.GetOrdersAsync(status, search, page, pageSize);

    public async Task<OrderDetail?> GetOrderDetailAsync(string id)
        => await _api.GetOrderDetailAsync(id);

    public async Task<bool> UpdateOrderStatusAsync(string id, string status, int adminId)
    {
        var ok = await _api.UpdateOrderStatusAsync(id, status, adminId);
        if (ok)
        {
            var admin = await _db.AdminUsers.FindAsync(adminId);
            await LogActionAsync(adminId, admin!.Email, $"UPDATE_ORDER_STATUS_{status.ToUpper()}", "Order", id);
        }
        return ok;
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
            IsActive = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedByAdminId = adminId
        };
        _db.AiConfigs.Add(config);
        await _db.SaveChangesAsync();

        var count = await _db.AiConfigs.CountAsync();
        if (count == 1) { config.IsActive = true; await _db.SaveChangesAsync(); }

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

        if (req.IsActive == true)
        {
            var others = await _db.AiConfigs.Where(x => x.Id != id).ToListAsync();
            others.ForEach(x => x.IsActive = false);
        }
        if (req.IsActive.HasValue) config.IsActive = req.IsActive.Value;

        config.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var admin = await _db.AdminUsers.FindAsync(adminId);
        await LogActionAsync(adminId, admin!.Email, "UPDATED_AI_CONFIG", "AiConfig", config.Id.ToString(), $"Updated {config.Name}");

        await _configSync.SetConfigAsync("ai:active_provider", config.Provider);
        await _configSync.SetConfigAsync("ai:active_config_id", config.Id.ToString());
        if (config.IsActive)
            await _configSync.PublishAiConfigAsync(config);

        return new AiConfigItem(config.Id, config.Name, config.Provider, MaskApiKey(config.ApiKey),
            config.Endpoint, config.BaseUrl, config.DeploymentName, config.ModelName, config.IsActive, config.CreatedAt, config.UpdatedAt);
    }

    public async Task<bool> DeleteAiConfigAsync(int id, int adminId)
    {
        if (id == 1) return false;
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

        await _configSync.SetConfigAsync($"rule:{rule.Key}", rule.Value);

        var allRules = await _db.ModerationRules.AsNoTracking().ToListAsync();
        var rulesDict = allRules.ToDictionary(r => r.Key, r => r.Value);
        await _configSync.PublishConfigChangeAsync("moderation:rules:updated", rulesDict);

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

        await _configSync.SetConfigAsync($"setting:{req.Key}", req.Value);

        return true;
    }

    // ── Saved Lists (via Kita API) ───────────────────────────────────────────
    public async Task<PagedResult<SavedListItem>> GetSavedListsAsync(string? search, int page, int pageSize)
        => await _api.GetSavedListsAsync(search, page, pageSize);

    public async Task<SavedListDetail?> GetSavedListDetailAsync(string id)
        => await _api.GetSavedListDetailAsync(id);

    // ── Notifications (via Kita API) ───────────────────────────────────────
    public async Task<PagedResult<NotificationItem>> GetNotificationsAsync(string? type, bool? isRead, int page, int pageSize)
        => await _api.GetNotificationsAsync(type, isRead, page, pageSize);

    public async Task<NotificationStats> GetNotificationStatsAsync()
        => await _api.GetNotificationStatsAsync();

    // ── Conversations / Chat (via Kita API) ─────────────────────────────────
    public async Task<PagedResult<ConversationItem>> GetConversationsAsync(string? search, int page, int pageSize)
        => await _api.GetConversationsAsync(search, page, pageSize);

    public async Task<List<ChatMessageItem>> GetChatMessagesAsync(string conversationId, int page, int pageSize)
        => await _api.GetChatMessagesAsync(conversationId, page, pageSize);

    // ── Push Tokens (via Kita API) ─────────────────────────────────────────
    public async Task<PagedResult<PushTokenItem>> GetPushTokensAsync(string? search, int page, int pageSize)
        => await _api.GetPushTokensAsync(search, page, pageSize);

    // ── Comments (via Kita API) ─────────────────────────────────────────────
    public async Task<PagedResult<CommentItem>> GetCommentsAsync(Guid? dealId, Guid? userId, string? status, int page, int size)
        => await _api.GetCommentsAsync(dealId, userId, status, page, size);

    public async Task<CommentStats> GetCommentStatsAsync()
        => await _api.GetCommentStatsAsync();

    public async Task<bool> HideCommentAsync(Guid id)
        => await _api.HideCommentAsync(id);

    public async Task<bool> ApproveCommentAsync(Guid id)
        => await _api.ApproveCommentAsync(id);

    public async Task<bool> DeleteCommentAsync(Guid id)
        => await _api.DeleteCommentAsync(id);

    // ── Follows (via Kita API) ─────────────────────────────────────────────
    public async Task<FollowStats> GetFollowStatsAsync(Guid userId)
        => await _api.GetFollowStatsAsync(userId);

    public async Task<PagedResult<FollowerItem>> GetFollowersAsync(Guid userId, int page, int size)
        => await _api.GetFollowersAsync(userId, page, size);

    public async Task<PagedResult<FollowerItem>> GetFollowingAsync(Guid userId, int page, int size)
        => await _api.GetFollowingAsync(userId, page, size);

    // ── Contributor Applications (via Kita API) ─────────────────────────────
    public async Task<PagedResult<ContributorApplicationListItem>> GetContributorApplicationsAsync(string? status, int page, int size)
        => await _api.GetContributorApplicationsAsync(status, page, size);

    public async Task<bool> ReviewContributorApplicationAsync(Guid id, string action, string? reason, int adminId)
    {
        var ok = await _api.ReviewContributorApplicationAsync(id, action, reason, adminId);
        if (ok)
        {
            var admin = await _db.AdminUsers.FindAsync(adminId);
            await LogActionAsync(adminId, admin!.Email, $"CONTRIBUTOR_APPLICATION_{action.ToUpper()}", "ContributorApplication", id.ToString(), reason);
        }
        return ok;
    }

    // ── User Activity (via Kita API) ───────────────────────────────────────
    public async Task<UserActivityTimeline?> GetUserActivityAsync(string userId)
    {
        var detail = await _api.GetUserDetailAsync(userId);
        if (detail == null) return null;

        // Build from the detail + API calls
        var followStats = await _api.GetFollowStatsAsync(Guid.Parse(userId));
        var comments = await _api.GetCommentsAsync(null, Guid.Parse(userId), null, 1, 20);
        var savedLists = await _api.GetSavedListsAsync(null, 1, 20);
        var notifications = await _api.GetNotificationsAsync(null, null, 1, 20);

        var activities = new List<ActivityItem>();

        // Add deals as activity
        foreach (var d in detail.DealsPosted)
            activities.Add(new ActivityItem("deal_posted", $"Posted deal: {d.Title}", d.Id, d.CreatedAt));

        // Add orders as activity
        foreach (var o in detail.Orders)
            activities.Add(new ActivityItem("order_placed", $"Joined deal: {o.DealTitle}", o.Id, o.CreatedAt));

        // Add recent comments
        foreach (var c in comments.Items)
            activities.Add(new ActivityItem("comment", $"Commented: {c.Content[..Math.Min(30, c.Content.Length)]}...", c.Id.ToString(), c.CreatedAt));

        activities = activities.OrderByDescending(a => a.At).Take(50).ToList();

        return new UserActivityTimeline(
            detail.Id, detail.Email, detail.FullName,
            activities,
            detail.DealsPosted.Count,
            detail.Orders.Count,
            savedLists.Items.Sum(sl => sl.DealCount),
            notifications.Items.Count(i => !i.IsRead));
    }

    // ── Deal Statistics (via Kita API) ─────────────────────────────────────
    public async Task<DealStats> GetDealStatsAsync(int days = 30)
        => await _api.GetDealStatsAsync(days);

    // ── Bulk Actions (via Kita API) ───────────────────────────────────────
    public async Task<BulkActionResult> BulkModerateDealsAsync(BulkActionRequest req, int adminId)
    {
        var result = await _api.BulkModerateDealsAsync(req, adminId);
        if (result.Succeeded > 0)
        {
            var admin = await _db.AdminUsers.FindAsync(adminId);
            await LogActionAsync(adminId, admin!.Email,
                $"BULK_MODERATE_{req.Action.ToUpper()}", "Deal",
                string.Join(",", req.Ids),
                $"Bulk {req.Action} on {result.Succeeded} deals");
        }
        return result;
    }

    // ── Categories (admin DB) ───────────────────────────────────────────────
    public async Task<List<CategoryItem>> GetCategoriesAsync()
    {
        var cats = await _db.Categories.AsNoTracking().OrderBy(c => c.Name).ToListAsync();
        var items = new List<CategoryItem>();
        foreach (var c in cats)
            items.Add(new CategoryItem(c.Id, c.Name, c.Description, 0, c.IsActive, c.CreatedAt));
        return items;
    }

    public async Task<CategoryItem?> CreateCategoryAsync(CreateCategoryRequest req, int adminId)
    {
        var existing = await _db.Categories.FirstOrDefaultAsync(c => c.Name == req.Name);
        if (existing != null) return null;

        var cat = new Category
        {
            Name = req.Name,
            Description = req.Description,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _db.Categories.Add(cat);
        await _db.SaveChangesAsync();
        await LogActionAsync(adminId, (await _db.AdminUsers.FindAsync(adminId))!.Email,
            "CREATED_CATEGORY", "Category", cat.Id.ToString(), $"Created category: {cat.Name}");
        return new CategoryItem(cat.Id, cat.Name, cat.Description, 0, cat.IsActive, cat.CreatedAt);
    }

    public async Task<CategoryItem?> UpdateCategoryAsync(int id, UpdateCategoryRequest req, int adminId)
    {
        var cat = await _db.Categories.FindAsync(id);
        if (cat == null) return null;

        if (req.Name != null) cat.Name = req.Name;
        if (req.Description != null) cat.Description = req.Description;
        if (req.IsActive.HasValue) cat.IsActive = req.IsActive.Value;
        await _db.SaveChangesAsync();

        var admin = await _db.AdminUsers.FindAsync(adminId);
        await LogActionAsync(adminId, admin!.Email, "UPDATED_CATEGORY", "Category", id.ToString(), $"Updated category: {cat.Name}");

        return new CategoryItem(cat.Id, cat.Name, cat.Description, 0, cat.IsActive, cat.CreatedAt);
    }

    public async Task<bool> DeleteCategoryAsync(int id, int adminId)
    {
        var cat = await _db.Categories.FindAsync(id);
        if (cat == null) return false;
        _db.Categories.Remove(cat);
        await _db.SaveChangesAsync();
        var admin = await _db.AdminUsers.FindAsync(adminId);
        await LogActionAsync(adminId, admin!.Email, "DELETED_CATEGORY", "Category", id.ToString(), $"Deleted category: {cat.Name}");
        return true;
    }
}
