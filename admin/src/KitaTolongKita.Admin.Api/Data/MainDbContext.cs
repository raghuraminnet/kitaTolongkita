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
    public DbSet<MainOrder> Orders => Set<MainOrder>();

    protected override void OnModelCreating(ModelBuilder m)
    {
        m.Entity<MainUser>(e => e.ToTable("users", "public"));
        m.Entity<MainDeal>(e => e.ToTable("deals", "public"));
        m.Entity<MainOrder>(e => e.ToTable("orders", "public"));
        base.OnModelCreating(m);
    }
}

public class MainUser
{
    public Guid Id { get; set; }
    public string Email { get; set; } = "";
    public string FullName { get; set; } = "";
    public string? AvatarUrl { get; set; }
    public bool EmailVerified { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public ICollection<MainDeal> OrganizedDeals { get; set; } = new List<MainDeal>();
    public ICollection<MainOrder> Orders { get; set; } = new List<MainOrder>();
}

public class MainDeal
{
    public Guid Id { get; set; }
    public string Title { get; set; } = "";
    public string Category { get; set; } = "";
    public string Description { get; set; } = "";
    public decimal OriginalPrice { get; set; }
    public decimal GroupPrice { get; set; }
    public int MinGroup { get; set; }
    public int CurrentGroup { get; set; }
    public Guid OrganizerId { get; set; }
    public MainUser? Organizer { get; set; }
    public string ModerationStatus { get; set; } = "Pending";
    public double? ModerationScore { get; set; }
    public string? ModerationRejectReason { get; set; }
    public bool IsFeatured { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? Deadline { get; set; }
    public List<string> ImageUrls { get; set; } = new();
    public List<string> Hashtags { get; set; } = new();
    public ICollection<MainOrder> Orders { get; set; } = new List<MainOrder>();
}

public class MainOrder
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public MainUser? User { get; set; }
    public Guid DealId { get; set; }
    public MainDeal? Deal { get; set; }
    public string Status { get; set; } = "Pending";
    public decimal Amount { get; set; }
    public int Quantity { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
