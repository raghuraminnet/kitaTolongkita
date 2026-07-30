using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using KitaTolongKita.Admin.Api.Data;
using KitaTolongKita.Admin.Api.DTOs;
using KitaTolongKita.Admin.Api.Entities;

namespace KitaTolongKita.Admin.Api.Services;

public interface IAdminService
{
    // Auth
    Task<AdminUser> CreateAdminUserAsync(string email, string password, string fullName, string role);

    // Users
    Task<PagedResult<UserListItem>> GetUsersAsync(string? search, string? filter, int page, int pageSize);
    Task<UserDetail?> GetUserDetailAsync(int id);
    Task<bool> ToggleUserStatusAsync(int id, bool isActive, int adminId);

    // Deals
    Task<PagedResult<DealModerationItem>> GetPendingDealsAsync(int page, int pageSize);
    Task<PagedResult<DealListItem>> GetAllDealsAsync(string? status, string? search, int page, int pageSize);
    Task<bool> ApproveDealAsync(int id, int adminId);
    Task<bool> RejectDealAsync(int id, string reason, int adminId);
    Task<bool> FeatureDealAsync(int id, bool featured, int adminId);

    // Orders
    Task<PagedResult<OrderListItem>> GetOrdersAsync(string? status, string? search, int page, int pageSize);
    Task<OrderDetail?> GetOrderDetailAsync(int id);
    Task<bool> UpdateOrderStatusAsync(int id, string status, int adminId);

    // Settings
    Task<List<SettingItem>> GetSettingsAsync();
    Task<bool> UpdateSettingAsync(UpdateSettingRequest req, int adminId);
}

public class AdminService : IAdminService
{
    private readonly AdminDbContext _db;
    private readonly HttpClient _http;
    private readonly ILogger<AdminService> _logger;
    private readonly string _mainApiBase;

    public AdminService(AdminDbContext db, IHttpClientFactory httpFactory, IConfiguration config, ILogger<AdminService> logger)
    {
        _db = db;
        _http = httpFactory.CreateClient("MainApi");
        _http.BaseAddress = new Uri(config["MainApi:BaseUrl"] ?? "http://kita-api:5000/api");
        _mainApiBase = config["MainApi:BaseUrl"] ?? "http://kita-api:5000/api";
        _logger = logger;
    }

    // ── Audit helper ────────────────────────────────────────────────────────────
    private async Task LogActionAsync(int adminId, string adminEmail, string action, string entityType, int entityId, string? details = null)
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

    // ── Users ──────────────────────────────────────────────────────────────────
    public async Task<PagedResult<UserListItem>> GetUsersAsync(string? search, string? filter, int page, int pageSize)
    {
        try
        {
            var url = $"{_mainApiBase}/admin/users?search={search ?? ""}&filter={filter ?? ""}&page={page}&pageSize={pageSize}";
            var resp = await _http.GetAsync(url);
            if (resp.IsSuccessStatusCode)
            {
                var json = await resp.Content.ReadAsStringAsync();
                return JsonSerializer.Deserialize<PagedResult<UserListItem>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                    ?? new PagedResult<UserListItem>(new(), 0, page, pageSize, 0);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to fetch users from main API");
        }

        return new PagedResult<UserListItem>(new(), 0, page, pageSize, 0);
    }

    public async Task<UserDetail?> GetUserDetailAsync(int id)
    {
        try
        {
            var resp = await _http.GetAsync($"{_mainApiBase}/admin/users/{id}");
            if (resp.IsSuccessStatusCode)
            {
                var json = await resp.Content.ReadAsStringAsync();
                return JsonSerializer.Deserialize<UserDetail>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
        }
        catch { }
        return null;
    }

    public async Task<bool> ToggleUserStatusAsync(int id, bool isActive, int adminId)
    {
        try
        {
            var admin = await _db.AdminUsers.FindAsync(adminId);
            var resp = await _http.PatchAsync($"{_mainApiBase}/admin/users/{id}/status",
                JsonContent(new { isActive }));
            if (resp.IsSuccessStatusCode)
            {
                await LogActionAsync(adminId, admin!.Email, isActive ? "ENABLED_USER" : "DISABLED_USER", "User", id);
                return true;
            }
        }
        catch { }
        return false;
    }

    // ── Deals ─────────────────────────────────────────────────────────────────
    public async Task<PagedResult<DealModerationItem>> GetPendingDealsAsync(int page, int pageSize)
    {
        try
        {
            var resp = await _http.GetAsync($"{_mainApiBase}/admin/moderation/pending?page={page}&pageSize={pageSize}");
            if (resp.IsSuccessStatusCode)
            {
                var json = await resp.Content.ReadAsStringAsync();
                return JsonSerializer.Deserialize<PagedResult<DealModerationItem>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                    ?? new PagedResult<DealModerationItem>(new(), 0, page, pageSize, 0);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to fetch pending deals");
        }
        return new PagedResult<DealModerationItem>(new(), 0, page, pageSize, 0);
    }

    public async Task<PagedResult<DealListItem>> GetAllDealsAsync(string? status, string? search, int page, int pageSize)
    {
        try
        {
            var resp = await _http.GetAsync($"{_mainApiBase}/admin/deals?status={status ?? ""}&search={search ?? ""}&page={page}&pageSize={pageSize}");
            if (resp.IsSuccessStatusCode)
            {
                var json = await resp.Content.ReadAsStringAsync();
                return JsonSerializer.Deserialize<PagedResult<DealListItem>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                    ?? new PagedResult<DealListItem>(new(), 0, page, pageSize, 0);
            }
        }
        catch { }
        return new PagedResult<DealListItem>(new(), 0, page, pageSize, 0);
    }

    public async Task<bool> ApproveDealAsync(int id, int adminId)
    {
        try
        {
            var admin = await _db.AdminUsers.FindAsync(adminId);
            var resp = await _http.PostAsync($"{_mainApiBase}/admin/moderation/{id}/approve", null);
            if (resp.IsSuccessStatusCode)
            {
                await LogActionAsync(adminId, admin!.Email, "APPROVED_DEAL", "Deal", id);
                return true;
            }
        }
        catch { }
        return false;
    }

    public async Task<bool> RejectDealAsync(int id, string reason, int adminId)
    {
        try
        {
            var admin = await _db.AdminUsers.FindAsync(adminId);
            var resp = await _http.PostAsync($"{_mainApiBase}/admin/moderation/{id}/reject",
                JsonContent(new { reason }));
            if (resp.IsSuccessStatusCode)
            {
                await LogActionAsync(adminId, admin!.Email, "REJECTED_DEAL", "Deal", id, reason);
                return true;
            }
        }
        catch { }
        return false;
    }

    public async Task<bool> FeatureDealAsync(int id, bool featured, int adminId)
    {
        try
        {
            var admin = await _db.AdminUsers.FindAsync(adminId);
            var resp = await _http.PatchAsync($"{_mainApiBase}/admin/deals/{id}/feature",
                JsonContent(new { featured }));
            if (resp.IsSuccessStatusCode)
            {
                await LogActionAsync(adminId, admin!.Email, featured ? "FEATURED_DEAL" : "UNFEATURED_DEAL", "Deal", id);
                return true;
            }
        }
        catch { }
        return false;
    }

    // ── Orders ─────────────────────────────────────────────────────────────────
    public async Task<PagedResult<OrderListItem>> GetOrdersAsync(string? status, string? search, int page, int pageSize)
    {
        try
        {
            var resp = await _http.GetAsync($"{_mainApiBase}/admin/orders?status={status ?? ""}&search={search ?? ""}&page={page}&pageSize={pageSize}");
            if (resp.IsSuccessStatusCode)
            {
                var json = await resp.Content.ReadAsStringAsync();
                return JsonSerializer.Deserialize<PagedResult<OrderListItem>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                    ?? new PagedResult<OrderListItem>(new(), 0, page, pageSize, 0);
            }
        }
        catch { }
        return new PagedResult<OrderListItem>(new(), 0, page, pageSize, 0);
    }

    public async Task<OrderDetail?> GetOrderDetailAsync(int id)
    {
        try
        {
            var resp = await _http.GetAsync($"{_mainApiBase}/admin/orders/{id}");
            if (resp.IsSuccessStatusCode)
            {
                var json = await resp.Content.ReadAsStringAsync();
                return JsonSerializer.Deserialize<OrderDetail>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
        }
        catch { }
        return null;
    }

    public async Task<bool> UpdateOrderStatusAsync(int id, string status, int adminId)
    {
        try
        {
            var admin = await _db.AdminUsers.FindAsync(adminId);
            var resp = await _http.PatchAsync($"{_mainApiBase}/admin/orders/{id}/status",
                JsonContent(new { status }));
            if (resp.IsSuccessStatusCode)
            {
                await LogActionAsync(adminId, admin!.Email, $"UPDATE_ORDER_STATUS_{status.ToUpper()}", "Order", id);
                return true;
            }
        }
        catch { }
        return false;
    }

    // ── Settings ───────────────────────────────────────────────────────────────
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
        await LogActionAsync(adminId, admin!.Email, "UPDATED_SETTING", "Setting", 0, $"{req.Key} = {req.Value}");

        return true;
    }
}

public static class JsonContent
{
    public static StringContent New(object value) =>
        new StringContent(System.Text.Json.JsonSerializer.Serialize(value), System.Text.Encoding.UTF8, "application/json");
}
