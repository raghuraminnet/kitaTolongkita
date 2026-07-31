namespace KitaTolongKita.Admin.Api.Entities;

public class AdminUser
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "Viewer"; // SuperAdmin, Moderator, Viewer
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }
    public string? LastLoginIp { get; set; }
    public string? PasswordResetToken { get; set; }
    public DateTime? PasswordResetTokenExpiry { get; set; }
}

public class AuditLog
{
    public int Id { get; set; }
    public int AdminUserId { get; set; }
    public string AdminEmail { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string? Details { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class AppSetting
{
    public int Id { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public int UpdatedByAdminId { get; set; }
}

/// <summary>
/// Multiple AI provider configurations — one can be active at a time.
/// </summary>
public class AiConfig
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Provider { get; set; } = string.Empty; // azure-openai | openai | anthropic
    public string? ApiKey { get; set; }
    public string? Endpoint { get; set; }     // Azure OpenAI endpoint URL
    public string? BaseUrl { get; set; }      // OpenAI/Anthropic compatible base URL (e.g. https://api.groq.com, https://openrouter.ai)
    public string? DeploymentName { get; set; } // Azure OpenAI deployment
    public string? ModelName { get; set; }      // OpenAI/Anthropic model
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public int CreatedByAdminId { get; set; }
}

/// <summary>
/// Moderation rule thresholds and settings.
/// </summary>
public class ModerationRule
{
    public int Id { get; set; }
    public string Key { get; set; } = string.Empty;   // e.g. "auto_approve_threshold"
    public string Value { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Category { get; set; } = string.Empty; // "ai" | "deal" | "pilot"
    public bool IsActive { get; set; } = true;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public int UpdatedByAdminId { get; set; }
}
