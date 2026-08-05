namespace KitaTolongKita.Api.Controllers.AdminArea;

// ── Auth ─────────────────────────────────────────────────────────────────────
public record AdminLoginRequest(string Email, string Password);
public record AdminLoginResponse(string AccessToken, string FullName, string Role, int ExpiresIn);
public record ForgotPasswordRequest(string Email);
public record ResetPasswordRequest(string Token, string NewPassword);
public record ChangePasswordRequest(string OldPassword, string NewPassword);
public record AdminApiResponse(bool Success, string? Message = null, object? Data = null);

// ── Admin Users ────────────────────────────────────────────────────────────────
public record AdminUserItem(int Id, string Email, string FullName, string Role, bool IsActive, DateTime? LastLoginAt, DateTime CreatedAt);
public record CreateAdminUserRequest(string Email, string Password, string FullName, string Role);

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

// ── Moderation Rules ──────────────────────────────────────────────────────────
public record ModerationRuleItem(int Id, string Key, string Value, string? Description, string Category, bool IsActive, DateTime UpdatedAt);
public record UpdateModerationRuleRequest(string Value, bool? IsActive);

// ── Settings ─────────────────────────────────────────────────────────────────
public record SettingItem(string Key, string Value, string? Description);
public record UpdateSettingRequest(string Key, string Value);

// ── Categories ───────────────────────────────────────────────────────────────
public record CategoryItem(int Id, string Name, string? Description, int DealCount, bool IsActive, DateTime CreatedAt);
public record CreateCategoryRequest(string Name, string? Description);
public record UpdateCategoryRequest(string? Name, string? Description, bool? IsActive);

// ── Audit Logs ───────────────────────────────────────────────────────────────
public record AuditLogItem(int Id, int AdminUserId, string AdminEmail, string Action, string EntityType, string EntityId, string? Details, DateTime CreatedAt);

// ── Dashboard ─────────────────────────────────────────────────────────────────
public record DashboardKpis(
    int TotalUsers, int ActiveDeals, int OrdersToday, decimal TodayRevenue,
    int PendingModeration, int NewUsersToday, decimal GrowthPercent,
    List<DailyStat> UserStats, List<DailyStat> DealStats, List<RecentActivity> RecentActivity
);
public record DailyStat(string Date, int Count, decimal Amount = 0);
public record RecentActivity(string Action, string EntityType, string EntityId, string Summary, DateTime At);

// ── Common ────────────────────────────────────────────────────────────────────
public record PagedResult<T>(List<T> Items, int TotalCount, int Page, int PageSize, int TotalPages = 0);
