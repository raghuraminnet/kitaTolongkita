using Microsoft.EntityFrameworkCore;

namespace KitaTolongKita.Admin.Api.Data;

/// <summary>
/// EF context for the main KitaTolongKita database.
/// Used by AdminService for moderation actions (approve/reject deals).
/// Read-only queries for deals/users should go through MainDbService instead.
/// </summary>
public class MainDbContext : DbContext
{
    public MainDbContext(DbContextOptions<MainDbContext> opts) : base(opts) { }

    public DbSet<MainUser> Users => Set<MainUser>();
    public DbSet<MainDeal> Deals => Set<MainDeal>();
    public DbSet<MainDealOrder> Orders => Set<MainDealOrder>();

    protected override void OnModelCreating(ModelBuilder m)
    {
        m.Entity<MainUser>(e => e.ToTable("users", "public"));
        m.Entity<MainDeal>(e => e.ToTable("deals", "public"));
        m.Entity<MainDealOrder>(e => e.ToTable("deal_orders", "public"));

        // Navigation: deal → organizer
        m.Entity<MainDeal>()
            .HasOne(d => d.Organizer)
            .WithMany()
            .HasForeignKey(d => d.OrganizerId)
            .OnDelete(DeleteBehavior.SetNull);

        // Navigation: order → user
        m.Entity<MainDealOrder>()
            .HasOne(o => o.User)
            .WithMany()
            .HasForeignKey(o => o.BuyerId)
            .OnDelete(DeleteBehavior.SetNull);

        // Navigation: order → deal
        m.Entity<MainDealOrder>()
            .HasOne(o => o.Deal)
            .WithMany()
            .HasForeignKey(o => o.DealId)
            .OnDelete(DeleteBehavior.SetNull);

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

    public ICollection<MainDeal> OrganizedDeals { get; set; } = new List<MainDeal>();
    public ICollection<MainDealOrder> Orders { get; set; } = new List<MainDealOrder>();
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
    public string Status { get; set; } = "Draft";
    public DateTime CreatedAt { get; set; }
    public DateTime? PublishedAt { get; set; }
    public string? LocationName { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? Hashtags { get; set; }
    public int UpvoteCount { get; set; }
    public int LikeCount { get; set; }
    public string ModerationStatus { get; set; } = "Pending";
    public int? ModerationScore { get; set; }
    public string? ModerationRejectReason { get; set; }
    public bool IsFeatured { get; set; }

    public MainUser? Organizer { get; set; }
    public ICollection<MainDealOrder> Orders { get; set; } = new List<MainDealOrder>();
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
    public DateTime? UpdatedAt { get; set; }

    public MainUser? User { get; set; }
    public MainDeal? Deal { get; set; }
}
