using Microsoft.EntityFrameworkCore;

namespace KitaTolongKita.Admin.Api.Data;

/// <summary>
/// Read-only EF context for the main KitaTolongKita database.
/// Admin API uses this to query users, deals, and orders directly.
/// </summary>
public class MainDbContext : DbContext
{
    public MainDbContext(DbContextOptions<MainDbContext> opts) : base(opts) { }

    public DbSet<MainUser> Users => Set<MainUser>();
    public DbSet<MainDeal> Deals => Set<MainDeal>();
    public DbSet<MainDealOrder> Orders => Set<MainDealOrder>();

    protected override void OnModelCreating(ModelBuilder m)
    {
        // Map to actual table/column names in kitatolongkita DB
        m.Entity<MainUser>(e => e.ToTable("users", "public"));
        m.Entity<MainDeal>(e => e.ToTable("deals", "public"));
        m.Entity<MainDealOrder>(e => e.ToTable("deal_orders", "public"));

        base.OnModelCreating(m);
    }
}

public class MainUser
{
    public Guid Id { get; set; }
    public string Email { get; set; } = "";
    public string FullName { get; set; } = "";
    public string? Phone { get; set; }
    public string? AvatarUrl { get; set; }
    public bool EmailVerified { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public bool IsActive { get; set; } = true;
}

public class MainDeal
{
    public Guid Id { get; set; }
    public Guid OrganizerId { get; set; }
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string Category { get; set; } = "";
    public decimal OriginalPrice { get; set; }
    public decimal GroupPrice { get; set; }
    public int MinMembers { get; set; }
    public int MaxMembers { get; set; }
    public int MembersJoined { get; set; }
    public DateTime Deadline { get; set; }
    public string PickupLocation { get; set; } = "";
    public string? ImageUrl { get; set; }
    public string Status { get; set; } = "Draft";       // stored as string in PG
    public DateTime CreatedAt { get; set; }
    public DateTime? PublishedAt { get; set; }
    public string? LocationName { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? Hashtags { get; set; }   // stored as string "tag1,tag2" in PG
    public int UpvoteCount { get; set; }
    public int LikeCount { get; set; }
    public string ModerationStatus { get; set; } = "Pending";
    public int? ModerationScore { get; set; }
    public string? ModerationRejectReason { get; set; }
}

public class MainDealOrder
{
    public Guid Id { get; set; }
    public Guid DealId { get; set; }
    public Guid BuyerId { get; set; }
    public int Quantity { get; set; } = 1;
    public decimal TotalPrice { get; set; }
    public string Status { get; set; } = "Pending";
    public DateTime CreatedAt { get; set; }
}
