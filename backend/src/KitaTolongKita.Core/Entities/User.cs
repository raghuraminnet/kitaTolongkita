namespace KitaTolongKita.Core.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string? GoogleId { get; set; }
    public string? PasswordHash { get; set; }
    public bool EmailVerified { get; set; }
    public bool PhoneVerified { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }
    public double? LastKnownLatitude { get; set; }
    public double? LastKnownLongitude { get; set; }
    public DateTime? LocationUpdatedAt { get; set; }
    public UserStatus Status { get; set; } = UserStatus.Active;
    public List<UserAddress> Addresses { get; set; } = [];
    public List<SavedList> SavedLists { get; set; } = [];

    // ── Social: Follow system ───────────────────────────────────────────────────
    public List<UserFollow> Followers { get; set; } = [];   // users who follow this user
    public List<UserFollow> Following { get; set; } = [];  // users this user follows

    // ── Profile fields ──────────────────────────────────────────────────────────
    public string? Bio { get; set; }
    public string? City { get; set; }
    public string? Website { get; set; }
    public bool IsVerified { get; set; } = false;
    public bool IsContributor { get; set; } = false;
    public DateTime? ContributorSince { get; set; }
    public decimal? ContributorRating { get; set; }
}

public enum UserStatus
{
    Active,
    Suspended,
    Deleted,
    /// <summary>Can browse and chat but cannot create new deals.</summary>
    PostingAccessRevoked,
}

public class UserAddress
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Label { get; set; } = string.Empty; // "Home", "Office"
    public string FullAddress { get; set; } = string.Empty;
    public string? Postcode { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public bool IsDefault { get; set; }
}
