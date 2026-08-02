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

// ── App Deals (from main DB) ─────────────────────────────────────────────────────
public record AppDealItem(
    Guid Id, string Title, string Description, string Category,
    decimal OriginalPrice, decimal GroupPrice,
    int MinMembers, int MaxMembers, int MembersJoined,
    DateTime Deadline, string PickupLocation, string? ImageUrl,
    string Status, string ModerationStatus, int? ModerationScore, string? ModerationRejectReason,
    int UpvoteCount, int LikeCount,
    Guid OrganizerId, DateTime CreatedAt, DateTime? PublishedAt
);
public record AppUserItem(
    Guid Id, string Email, string FullName, string? Phone, string? AvatarUrl,
    bool EmailVerified, DateTime CreatedAt, DateTime? LastLoginAt, bool IsActive
);

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

// ── Saved Lists ─────────────────────────────────────────────────────────────────
public record SavedListItem(
    Guid Id, Guid UserId, string UserEmail, string UserName,
    string Name, bool IsPublic, int DealCount, DateTime CreatedAt
);
public record SavedListDetail(
    Guid Id, Guid UserId, string UserEmail, string UserName,
    string Name, bool IsPublic, DateTime CreatedAt,
    List<SavedDealItem> Deals
);
public record SavedDealItem(
    Guid Id, Guid DealId, string DealTitle, string DealCategory,
    decimal DealPrice, string DealStatus, DateTime SavedAt
);

// ── Notifications ────────────────────────────────────────────────────────────────
public record NotificationItem(
    Guid Id, Guid UserId, string UserEmail, string UserName,
    string Type, string Title, string Body, bool IsRead, DateTime CreatedAt
);
public record NotificationStats(int Total, int Unread, int Read);

// ── Conversations / Chat ────────────────────────────────────────────────────────
public record ConversationItem(
    Guid Id, Guid? DealId, string? DealTitle,
    List<ParticipantInfo> Participants, int MessageCount,
    string? LastMessage, DateTime? LastMessageAt, DateTime CreatedAt
);
public record ParticipantInfo(Guid UserId, string FullName, string? AvatarUrl);
public record ChatMessageItem(
    Guid Id, Guid SenderId, string SenderName, string Content,
    bool IsRead, DateTime CreatedAt
);

// ── Push Tokens ────────────────────────────────────────────────────────────────
public record PushTokenItem(
    Guid Id, Guid UserId, string UserEmail, string UserName,
    string TokenMasked, string Platform, bool IsActive,
    DateTime CreatedAt, DateTime? LastUsedAt
);

// ── Deal Statistics ─────────────────────────────────────────────────────────────
public record DealStats(
    int TotalDeals, int ApprovedDeals, int RejectedDeals, int PendingDeals,
    int FeaturedDeals, int TotalOrders, decimal TotalRevenue,
    List<CategoryStat> TopCategories, List<DailyStat> DealsOverTime
);
public record CategoryStat(string Category, int Count, int TotalOrders, decimal TotalRevenue);

// ── User Activity Timeline ──────────────────────────────────────────────────────
public record UserActivityTimeline(
    string UserId, string Email, string FullName,
    List<ActivityItem> Activities, int TotalDealsPosted, int TotalOrdersPlaced,
    int TotalSavedDeals, int TotalNotificationsReceived
);
public record ActivityItem(string Type, string Summary, string EntityId, DateTime At);

// ── Bulk Actions ────────────────────────────────────────────────────────────────
public record BulkActionRequest(List<string> Ids, string Action, string? Reason);
public record BulkActionResult(int Succeeded, int Failed, List<string> Errors);

// ── Categories ─────────────────────────────────────────────────────────────────
public record CategoryItem(int Id, string Name, string? Description, int DealCount, bool IsActive, DateTime CreatedAt);
public record CreateCategoryRequest(string Name, string? Description);
public record UpdateCategoryRequest(string? Name, string? Description, bool? IsActive);

// ── Export ─────────────────────────────────────────────────────────────────────
public record ExportResult(string DownloadUrl, string FileName, int RowCount, DateTime GeneratedAt);

// ── Common ─────────────────────────────────────────────────────────────────────
public record PagedResult<T>(List<T> Items, int TotalCount, int Page, int PageSize, int TotalPages);
public record ApiResponse(bool Success, string? Message = null, object? Data = null);
public record ApiMessage(bool Success, string Message);
