using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using KitaTolongKita.Admin.Api.DTOs;

namespace KitaTolongKita.Admin.Api.Services;

/// <summary>
/// HTTP client for the Kita API (port 5000).
/// Used by Admin API to read/write app data without direct DB access.
/// Authentication: X-Internal-Api-Key header (shared secret with Kita API).
/// </summary>
public interface IMainApiClient
{
    // Users
    Task<PagedResult<UserListItem>> GetUsersAsync(string? search, string? filter, int page, int pageSize);
    Task<UserDetail?> GetUserDetailAsync(string id);
    Task<bool> ToggleUserStatusAsync(string id, bool isActive, int adminId);
    Task<bool> VerifyUserAsync(string id, bool verify, int adminId);

    // Deals
    Task<PagedResult<DealModerationItem>> GetPendingDealsAsync(int page, int pageSize);
    Task<PagedResult<DealListItem>> GetAllDealsAsync(string? status, string? search, int page, int pageSize);
    Task<bool> ApproveDealAsync(string id, int adminId);
    Task<bool> RejectDealAsync(string id, string reason, int adminId);
    Task<bool> FeatureDealAsync(string id, bool featured, int adminId);

    // Orders
    Task<PagedResult<OrderListItem>> GetOrdersAsync(string? status, string? search, int page, int pageSize);
    Task<OrderDetail?> GetOrderDetailAsync(string id);
    Task<bool> UpdateOrderStatusAsync(string id, string status, int adminId);

    // Saved Lists
    Task<PagedResult<SavedListItem>> GetSavedListsAsync(string? search, int page, int pageSize);
    Task<SavedListDetail?> GetSavedListDetailAsync(string id);

    // Notifications
    Task<PagedResult<NotificationItem>> GetNotificationsAsync(string? type, bool? isRead, int page, int pageSize);
    Task<NotificationStats> GetNotificationStatsAsync();

    // Conversations
    Task<PagedResult<ConversationItem>> GetConversationsAsync(string? search, int page, int pageSize);
    Task<List<ChatMessageItem>> GetChatMessagesAsync(string conversationId, int page, int pageSize);

    // Push Tokens
    Task<PagedResult<PushTokenItem>> GetPushTokensAsync(string? search, int page, int pageSize);

    // Comments
    Task<PagedResult<CommentItem>> GetCommentsAsync(Guid? dealId, Guid? userId, string? status, int page, int size);
    Task<CommentStats> GetCommentStatsAsync();
    Task<bool> HideCommentAsync(Guid id);
    Task<bool> ApproveCommentAsync(Guid id);
    Task<bool> DeleteCommentAsync(Guid id);

    // Follows
    Task<FollowStats> GetFollowStatsAsync(Guid userId);
    Task<PagedResult<FollowerItem>> GetFollowersAsync(Guid userId, int page, int size);
    Task<PagedResult<FollowerItem>> GetFollowingAsync(Guid userId, int page, int size);

    // Contributor Applications
    Task<PagedResult<ContributorApplicationListItem>> GetContributorApplicationsAsync(string? status, int page, int size);
    Task<bool> ReviewContributorApplicationAsync(Guid id, string action, string? reason, int adminId);

    // Bulk
    Task<BulkActionResult> BulkModerateDealsAsync(BulkActionRequest req, int adminId);

    // Dashboard & Stats
    Task<DashboardKpis> GetDashboardKpisAsync();
    Task<DealStats> GetDealStatsAsync(int days = 30);
}

public class MainApiClient : IMainApiClient
{
    private readonly HttpClient _http;
    private readonly string _internalKey;
    private readonly ILogger<MainApiClient> _logger;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        // Ignore case when matching JSON properties to DTO properties
        // (Kita API returns camelCase/snake_case; DTOs use PascalCase)
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public MainApiClient(
        HttpClient http,
        IConfiguration config,
        ILogger<MainApiClient> logger)
    {
        _http = http;
        _internalKey = config["InternalApiKey"] ?? "kita-internal-service-key-2024";
        _logger = logger;

        _http.BaseAddress = new Uri(config["MainApi:BaseUrl"] ?? "http://kita-api:5000/api");
        _http.DefaultRequestHeaders.Clear();
        _http.DefaultRequestHeaders.Add("X-Internal-Api-Key", _internalKey);
        _http.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<T> GetAsync<T>(string path)
    {
        var resp = await _http.GetAsync(path);
        resp.EnsureSuccessStatusCode();
        var json = await resp.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<T>(json, JsonOpts) ?? throw new InvalidOperationException("Deserialized null");
    }

    private async Task<T> PostAsync<T>(string path, object? body = null)
    {
        var content = body != null
            ? new StringContent(JsonSerializer.Serialize(body, JsonOpts), Encoding.UTF8, "application/json")
            : null;
        var resp = await _http.PostAsync(path, content);
        resp.EnsureSuccessStatusCode();
        var json = await resp.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<T>(json, JsonOpts) ?? throw new InvalidOperationException("Deserialized null");
    }

    private async Task<BoolResult> PostBoolAsync(string path, object? body = null)
    {
        var content = body != null
            ? new StringContent(JsonSerializer.Serialize(body, JsonOpts), Encoding.UTF8, "application/json")
            : null;
        var resp = await _http.PostAsync(path, content);
        var json = await resp.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<SuccessResponse>(json, JsonOpts);
        return new BoolResult(result?.Success ?? false);
    }

    private async Task<BoolResult> PatchAsync(string path, object? body = null)
    {
        var content = body != null
            ? new StringContent(JsonSerializer.Serialize(body, JsonOpts), Encoding.UTF8, "application/json")
            : new StringContent("{}", Encoding.UTF8, "application/json");
        var req = new HttpRequestMessage(HttpMethod.Patch, path) { Content = content };
        var resp = await _http.SendAsync(req);
        var json = await resp.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<SuccessResponse>(json, JsonOpts);
        return new BoolResult(result?.Success ?? false);
    }

    // ── Users ────────────────────────────────────────────────────────────────

    public async Task<PagedResult<UserListItem>> GetUsersAsync(string? search, string? filter, int page, int pageSize)
    {
        var qs = BuildQs(("search", search), ("filter", filter), ("page", page), ("pageSize", pageSize));
        return await GetAsync<PagedResult<UserListItem>>($"/admin/users{qs}");
    }

    public async Task<UserDetail?> GetUserDetailAsync(string id)
    {
        return await GetAsync<UserDetail?>($"/admin/users/{id}");
    }

    public async Task<bool> ToggleUserStatusAsync(string id, bool isActive, int adminId)
    {
        var result = await PatchAsync($"/admin/users/{id}/toggle-status", new { isActive });
        return result.Ok;
    }

    public async Task<bool> VerifyUserAsync(string id, bool verify, int adminId)
    {
        var result = await PatchAsync($"/admin/users/{id}/verify", new { verify });
        return result.Ok;
    }

    // ── Deals ────────────────────────────────────────────────────────────────

    public async Task<PagedResult<DealModerationItem>> GetPendingDealsAsync(int page, int pageSize)
    {
        var qs = BuildQs(("page", page), ("pageSize", pageSize));
        return await GetAsync<PagedResult<DealModerationItem>>($"/admin/moderation/pending{qs}");
    }

    public async Task<PagedResult<DealListItem>> GetAllDealsAsync(string? status, string? search, int page, int pageSize)
    {
        var qs = BuildQs(("status", status), ("search", search), ("page", page), ("pageSize", pageSize));
        return await GetAsync<PagedResult<DealListItem>>($"/admin/deals{qs}");
    }

    public async Task<bool> ApproveDealAsync(string id, int adminId)
    {
        var result = await PostAsync<SuccessResponse>($"/admin/moderation/{id}/approve", new { reason = (string?)null });
        return result.Success;
    }

    public async Task<bool> RejectDealAsync(string id, string reason, int adminId)
    {
        var result = await PostAsync<SuccessResponse>($"/admin/moderation/{id}/reject", new { reason });
        return result.Success;
    }

    public async Task<bool> FeatureDealAsync(string id, bool featured, int adminId)
    {
        var result = await PostAsync<SuccessResponse>($"/admin/deals/{id}/feature", new { featured });
        return result.Success;
    }

    // ── Orders ───────────────────────────────────────────────────────────────

    public async Task<PagedResult<OrderListItem>> GetOrdersAsync(string? status, string? search, int page, int pageSize)
    {
        var qs = BuildQs(("status", status), ("search", search), ("page", page), ("pageSize", pageSize));
        return await GetAsync<PagedResult<OrderListItem>>($"/admin/orders{qs}");
    }

    public async Task<OrderDetail?> GetOrderDetailAsync(string id)
    {
        return await GetAsync<OrderDetail?>($"/admin/orders/{id}");
    }

    public async Task<bool> UpdateOrderStatusAsync(string id, string status, int adminId)
    {
        var result = await PatchAsync($"/admin/orders/{id}/status", new { status });
        return result.Ok;
    }

    // ── Saved Lists ───────────────────────────────────────────────────────────

    public async Task<PagedResult<SavedListItem>> GetSavedListsAsync(string? search, int page, int pageSize)
    {
        var qs = BuildQs(("search", search), ("page", page), ("pageSize", pageSize));
        return await GetAsync<PagedResult<SavedListItem>>($"/admin/saved-lists{qs}");
    }

    public async Task<SavedListDetail?> GetSavedListDetailAsync(string id)
    {
        return await GetAsync<SavedListDetail?>($"/admin/saved-lists/{id}");
    }

    // ── Notifications ───────────────────────────────────────────────────────

    public async Task<PagedResult<NotificationItem>> GetNotificationsAsync(string? type, bool? isRead, int page, int pageSize)
    {
        var qs = BuildQs(("type", type), ("isRead", isRead?.ToString()), ("page", page), ("pageSize", pageSize));
        return await GetAsync<PagedResult<NotificationItem>>($"/admin/notifications{qs}");
    }

    public async Task<NotificationStats> GetNotificationStatsAsync()
    {
        return await GetAsync<NotificationStats>($"/admin/notifications/stats");
    }

    // ── Conversations ────────────────────────────────────────────────────────

    public async Task<PagedResult<ConversationItem>> GetConversationsAsync(string? search, int page, int pageSize)
    {
        var qs = BuildQs(("search", search), ("page", page), ("pageSize", pageSize));
        return await GetAsync<PagedResult<ConversationItem>>($"/admin/conversations{qs}");
    }

    public async Task<List<ChatMessageItem>> GetChatMessagesAsync(string conversationId, int page, int pageSize)
    {
        var qs = BuildQs(("page", page), ("pageSize", pageSize));
        return await GetAsync<List<ChatMessageItem>>($"/admin/conversations/{conversationId}/messages{qs}");
    }

    // ── Push Tokens ─────────────────────────────────────────────────────────

    public async Task<PagedResult<PushTokenItem>> GetPushTokensAsync(string? search, int page, int pageSize)
    {
        var qs = BuildQs(("search", search), ("page", page), ("pageSize", pageSize));
        return await GetAsync<PagedResult<PushTokenItem>>($"/admin/push-tokens{qs}");
    }

    // ── Comments ────────────────────────────────────────────────────────────

    public async Task<PagedResult<CommentItem>> GetCommentsAsync(Guid? dealId, Guid? userId, string? status, int page, int size)
    {
        var qs = BuildQs(("dealId", dealId?.ToString()), ("userId", userId?.ToString()), ("status", status), ("page", page), ("size", size));
        return await GetAsync<PagedResult<CommentItem>>($"/admin/comments{qs}");
    }

    public async Task<CommentStats> GetCommentStatsAsync()
    {
        return await GetAsync<CommentStats>($"/admin/comments/stats");
    }

    public async Task<bool> HideCommentAsync(Guid id)
    {
        var result = await PatchAsync($"/admin/comments/{id}/hide");
        return result.Ok;
    }

    public async Task<bool> ApproveCommentAsync(Guid id)
    {
        var result = await PatchAsync($"/admin/comments/{id}/approve");
        return result.Ok;
    }

    public async Task<bool> DeleteCommentAsync(Guid id)
    {
        var resp = await _http.DeleteAsync($"/admin/comments/{id}");
        return resp.IsSuccessStatusCode;
    }

    // ── Follows ─────────────────────────────────────────────────────────────

    public async Task<FollowStats> GetFollowStatsAsync(Guid userId)
    {
        return await GetAsync<FollowStats>($"/admin/users/{userId}/follow-stats");
    }

    public async Task<PagedResult<FollowerItem>> GetFollowersAsync(Guid userId, int page, int size)
    {
        var qs = BuildQs(("page", page), ("size", size));
        return await GetAsync<PagedResult<FollowerItem>>($"/admin/users/{userId}/followers{qs}");
    }

    public async Task<PagedResult<FollowerItem>> GetFollowingAsync(Guid userId, int page, int size)
    {
        var qs = BuildQs(("page", page), ("size", size));
        return await GetAsync<PagedResult<FollowerItem>>($"/admin/users/{userId}/following{qs}");
    }

    // ── Contributor Applications ─────────────────────────────────────────────

    public async Task<PagedResult<ContributorApplicationListItem>> GetContributorApplicationsAsync(string? status, int page, int size)
    {
        var qs = BuildQs(("status", status), ("page", page), ("size", size));
        return await GetAsync<PagedResult<ContributorApplicationListItem>>($"/admin/contributor-applications{qs}");
    }

    public async Task<bool> ReviewContributorApplicationAsync(Guid id, string action, string? reason, int adminId)
    {
        var result = await PostAsync<SuccessResponse>($"/admin/contributor-applications/{id}/review", new { action, reason });
        return result.Success;
    }

    // ── Bulk ────────────────────────────────────────────────────────────────

    public async Task<BulkActionResult> BulkModerateDealsAsync(BulkActionRequest req, int adminId)
    {
        return await PostAsync<BulkActionResult>($"/admin/deals/bulk-moderate", req);
    }

    // ── Dashboard & Stats ───────────────────────────────────────────────────

    public async Task<DashboardKpis> GetDashboardKpisAsync()
    {
        return await GetAsync<DashboardKpis>($"/admin/dashboard");
    }

    public async Task<DealStats> GetDealStatsAsync(int days = 30)
    {
        return await GetAsync<DealStats>($"/admin/deals/stats?days={days}");
    }

    // ── Utilities ───────────────────────────────────────────────────────────

    private static string BuildQs(params (string key, object? val)[] args)
    {
        var parts = args
            .Where(a => a.val != null)
            .Select(a => $"{a.key}={Uri.EscapeDataString(a.val?.ToString() ?? "")}");
        return parts.Any() ? "?" + string.Join("&", parts) : "";
    }

    private record SuccessResponse(bool Success, string? Message = null, object? Data = null);
    private record BoolResult(bool Ok);
}
