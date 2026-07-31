namespace KitaTolongKita.Admin.Api.DTOs;

// ── Auth ─────────────────────────────────────────────────────────────────────────
public record AdminLoginRequest(string Email, string Password);
public record AdminLoginResponse(string AccessToken, string FullName, string Role, int ExpiresIn);
public record ResetPasswordRequest(string Token, string NewPassword);
public record ForgotPasswordRequest(string Email);
public record ChangePasswordRequest(string OldPassword, string NewPassword);

// ── Dashboard ───────────────────────────────────────────────────────────────────
public record DashboardKpis(
    int TotalUsers, int ActiveDeals, int OrdersToday, decimal TodayRevenue,
    int PendingModeration, int NewUsersToday, decimal GrowthPercent,
    List<DailyStat> UserStats, List<DailyStat> DealStats,
    List<RecentActivity> RecentActivity
);
public record DailyStat(string Date, int Count, decimal Amount = 0);
public record RecentActivity(string Action, string EntityType, string EntityId, string Summary, DateTime At);

// ── Admin Users ───────────────────────────────────────────────────────────────
public record AdminUserItem(int Id, string Email, string FullName, string Role, bool IsActive, DateTime? LastLoginAt, DateTime CreatedAt);
public record CreateAdminUserRequest(string Email, string Password, string FullName, string Role);

// ── Users ─────────────────────────────────────────────────────────────────────
public record UserListItem(
    string Id, string Email, string FullName, string? AvatarUrl,
    bool EmailVerified, bool IsActive, DateTime CreatedAt, int DealsPosted, int DealsJoined
);
public record UserDetail(
    string Id, string Email, string FullName, string? AvatarUrl,
    bool EmailVerified, bool IsActive, DateTime CreatedAt, DateTime? LastLoginAt,
    List<DealSummary> DealsPosted, List<OrderSummary> Orders
);
public record DealSummary(string Id, string Title, string Status, DateTime CreatedAt);
public record OrderSummary(string Id, string DealTitle, string Status, decimal Amount, DateTime CreatedAt);

// ── Deals ─────────────────────────────────────────────────────────────────────
public record DealModerationItem(
    string Id, string Title, string Category, string OrganizerName, string OrganizerEmail,
    decimal GroupPrice, decimal OriginalPrice, int MinGroup, int CurrentGroup,
    string Status, double? ModerationScore, string? ModerationReason,
    List<string> ImageUrls, List<string> Hashtags, DateTime CreatedAt, DateTime? Deadline
);
public record DealListItem(
    string Id, string Title, string Category, string OrganizerName,
    decimal GroupPrice, int CurrentGroup, int MinGroup,
    string Status, bool IsFeatured, DateTime CreatedAt
);

// ── Orders ─────────────────────────────────────────────────────────────────────
public record OrderListItem(
    string Id, string BuyerName, string BuyerEmail,
    string DealTitle, string Status, decimal Amount, int Quantity, DateTime CreatedAt
);
public record OrderDetail(
    string Id, string BuyerName, string BuyerEmail, string? BuyerPhone,
    string DeliveryAddress, string DealTitle, string Status,
    decimal Amount, int Quantity, DateTime CreatedAt, DateTime? UpdatedAt
);

// ── AI Config ─────────────────────────────────────────────────────────────────
public record AiConfigItem(
    int Id, string Name, string Provider, string? ApiKeyMasked,
    string? Endpoint, string? BaseUrl, string? DeploymentName, string? ModelName,
    bool IsActive, DateTime CreatedAt, DateTime UpdatedAt
);
public record CreateAiConfigRequest(
    string Name, string Provider, string? ApiKey, string? Endpoint, string? BaseUrl,
    string? DeploymentName, string? ModelName
);
public record UpdateAiConfigRequest(
    string? Name, string? Provider, string? ApiKey, string? Endpoint, string? BaseUrl,
    string? DeploymentName, string? ModelName, bool? IsActive
);
public record TestAiConnectionRequest(string Provider, string? ApiKey, string? Endpoint, string? DeploymentName, string? ModelName, string? BaseUrl);
public record TestAiConnectionResponse(bool Success, string Message);

// ── Moderation Rules ─────────────────────────────────────────────────────────
public record ModerationRuleItem(
    int Id, string Key, string Value, string? Description, string Category,
    bool IsActive, DateTime UpdatedAt
);
public record UpdateModerationRuleRequest(string Value, bool? IsActive);

// ── Settings ─────────────────────────────────────────────────────────────────
public record SettingItem(string Key, string Value, string? Description);
public record UpdateSettingRequest(string Key, string Value);

// ── Common ─────────────────────────────────────────────────────────────────────
public record PagedResult<T>(List<T> Items, int TotalCount, int Page, int PageSize, int TotalPages);
public record ApiResponse(bool Success, string? Message = null, object? Data = null);
public record ApiMessage(bool Success, string Message);
