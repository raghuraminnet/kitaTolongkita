namespace KitaTolongKita.Core.Entities;

/// <summary>Categorises the business domain of a log entry.</summary>
public enum LogCategory
{
    Auth = 0,
    Deal = 1,
    Order = 2,
    User = 3,
    System = 4,
    Payment = 5,
    Notification = 6,
}

/// <summary>Severity level of a log entry.</summary>
public enum LogLevel
{
    Debug = 0,
    Info = 1,
    Warning = 2,
    Error = 3,
    Critical = 4,
}

public class ActivityLog
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Nullable — null for anonymous / system-initiated events.</summary>
    public Guid? UserId { get; set; }

    /// <summary>Denormalised for safe display without joins.</summary>
    public string? UserEmail { get; set; }

    public LogCategory Category { get; set; }

    public LogLevel Level { get; set; }

    /// <summary>Short action name, e.g. "UserLogin", "DealCreated", "PaymentFailed".</summary>
    public string Action { get; set; } = string.Empty;

    /// <summary>Type of entity affected, e.g. "Deal", "Order", "User".</summary>
    public string? EntityType { get; set; }

    public Guid? EntityId { get; set; }

    /// <summary>Human-readable summary of the event.</summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>JSON string for extra structured context (request body, diff, etc.).</summary>
    public string? Metadata { get; set; }

    public string? IpAddress { get; set; }

    public string? UserAgent { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
