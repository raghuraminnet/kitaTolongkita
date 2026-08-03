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

    // ── New entities ──────────────────────────────────────────────────────────
    public DbSet<MainSavedList> SavedLists => Set<MainSavedList>();
    public DbSet<MainSavedDeal> SavedDeals => Set<MainSavedDeal>();
    public DbSet<MainNotification> Notifications => Set<MainNotification>();
    public DbSet<MainConversation> Conversations => Set<MainConversation>();
    public DbSet<MainChatMessage> ChatMessages => Set<MainChatMessage>();
    public DbSet<MainPushToken> PushTokens => Set<MainPushToken>();
    public DbSet<MainUserFollow> UserFollows => Set<MainUserFollow>();
    public DbSet<MainDealComment> DealComments => Set<MainDealComment>();
    public DbSet<MainContributorApplication> ContributorApplications => Set<MainContributorApplication>();

    protected override void OnModelCreating(ModelBuilder m)
    {
        // ── Core tables ───────────────────────────────────────────────────────
        m.Entity<MainUser>(e => e.ToTable("Users", "public"));
        m.Entity<MainDeal>(e => e.ToTable("Deals", "public"));
        m.Entity<MainDealOrder>(e => e.ToTable("DealOrders", "public"));

        // ── Navigation: deal → organizer ──────────────────────────────────────
        m.Entity<MainDeal>()
            .HasOne(d => d.Organizer)
            .WithMany()
            .HasForeignKey(d => d.OrganizerId)
            .OnDelete(DeleteBehavior.SetNull);

        // ── Navigation: order → user ──────────────────────────────────────────
        m.Entity<MainDealOrder>()
            .HasOne(o => o.User)
            .WithMany()
            .HasForeignKey(o => o.BuyerId)
            .OnDelete(DeleteBehavior.SetNull);

        // ── Navigation: order → deal ─────────────────────────────────────────
        m.Entity<MainDealOrder>()
            .HasOne(o => o.Deal)
            .WithMany()
            .HasForeignKey(o => o.DealId)
            .OnDelete(DeleteBehavior.SetNull);

        // ── SavedList ─────────────────────────────────────────────────────────
        m.Entity<MainSavedList>(e => e.ToTable("saved_lists", "public"));
        m.Entity<MainSavedList>()
            .HasOne(sl => sl.User)
            .WithMany()
            .HasForeignKey(sl => sl.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // ── SavedDeal ─────────────────────────────────────────────────────────
        m.Entity<MainSavedDeal>(e => e.ToTable("saved_deals", "public"));
        m.Entity<MainSavedDeal>()
            .HasOne(sd => sd.User)
            .WithMany()
            .HasForeignKey(sd => sd.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        m.Entity<MainSavedDeal>()
            .HasOne(sd => sd.Deal)
            .WithMany()
            .HasForeignKey(sd => sd.DealId)
            .OnDelete(DeleteBehavior.Cascade);
        m.Entity<MainSavedDeal>()
            .HasOne(sd => sd.List)
            .WithMany(sl => sl.SavedDeals)
            .HasForeignKey(sd => sd.ListId)
            .OnDelete(DeleteBehavior.Cascade);

        // ── Notification ──────────────────────────────────────────────────────
        m.Entity<MainNotification>(e => e.ToTable("user_notifications", "public"));
        m.Entity<MainNotification>()
            .HasOne(n => n.User)
            .WithMany()
            .HasForeignKey(n => n.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        m.Entity<MainNotification>()
            .HasIndex(n => n.CreatedAt);
        m.Entity<MainNotification>()
            .HasIndex(n => n.IsRead);

        // ── Conversation ──────────────────────────────────────────────────────
        m.Entity<MainConversation>(e => e.ToTable("conversations", "public"));
        m.Entity<MainConversation>()
            .HasIndex(c => c.LastMessageAt);

        // ── ConversationParticipant ───────────────────────────────────────────
        m.Entity<MainConversationParticipant>(e => e.ToTable("conversation_participants", "public"));
        m.Entity<MainConversationParticipant>()
            .HasOne(cp => cp.Conversation)
            .WithMany(c => c.Participants)
            .HasForeignKey(cp => cp.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);
        m.Entity<MainConversationParticipant>()
            .HasOne(cp => cp.User)
            .WithMany()
            .HasForeignKey(cp => cp.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // ── ChatMessage ───────────────────────────────────────────────────────
        m.Entity<MainChatMessage>(e => e.ToTable("chat_messages", "public"));
        m.Entity<MainChatMessage>()
            .HasOne(m => m.Conversation)
            .WithMany(c => c.Messages)
            .HasForeignKey(m => m.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);
        m.Entity<MainChatMessage>()
            .HasIndex(m => m.CreatedAt);
        m.Entity<MainChatMessage>()
            .HasIndex(m => m.SenderId);

        // ── PushToken ─────────────────────────────────────────────────────────
        m.Entity<MainPushToken>(e => e.ToTable("push_tokens", "public"));
        m.Entity<MainPushToken>()
            .HasOne(pt => pt.User)
            .WithMany()
            .HasForeignKey(pt => pt.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        m.Entity<MainPushToken>()
            .HasIndex(pt => pt.Token)
            .IsUnique();
        m.Entity<MainPushToken>()
            .HasIndex(pt => pt.IsActive);

        // ── UserFollow ─────────────────────────────────────────────────────────
        m.Entity<MainUserFollow>(e => e.ToTable("user_follows", "public"));
        m.Entity<MainUserFollow>()
            .HasOne(uf => uf.Follower)
            .WithMany()
            .HasForeignKey(uf => uf.FollowerId)
            .OnDelete(DeleteBehavior.Cascade);
        m.Entity<MainUserFollow>()
            .HasOne(uf => uf.Following)
            .WithMany()
            .HasForeignKey(uf => uf.FollowingId)
            .OnDelete(DeleteBehavior.Cascade);
        m.Entity<MainUserFollow>()
            .HasIndex(uf => new { uf.FollowerId, uf.FollowingId }).IsUnique();

        // ── DealComment ────────────────────────────────────────────────────────
        m.Entity<MainDealComment>(e => e.ToTable("deal_comments", "public"));
        m.Entity<MainDealComment>()
            .HasOne(c => c.Deal)
            .WithMany()
            .HasForeignKey(c => c.DealId)
            .OnDelete(DeleteBehavior.Cascade);
        m.Entity<MainDealComment>()
            .HasOne(c => c.User)
            .WithMany()
            .HasForeignKey(c => c.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        m.Entity<MainDealComment>()
            .HasIndex(c => new { c.DealId, c.CreatedAt });
        m.Entity<MainDealComment>()
            .HasIndex(c => c.UserId);

        // ── Contributor Application ─────────────────────────────────────────────
        m.Entity<MainContributorApplication>(e => e.ToTable("contributor_applications", "public"));
        m.Entity<MainContributorApplication>()
            .HasOne(a => a.User)
            .WithMany()
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        m.Entity<MainContributorApplication>()
            .HasIndex(a => a.Status);
        m.Entity<MainContributorApplication>()
            .HasIndex(a => a.UserId);

        base.OnModelCreating(m);
    }
}

// ── Main DB Entity Classes ────────────────────────────────────────────────────

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
    public string? Bio { get; set; }
    public string? City { get; set; }
    public string? Website { get; set; }
    public bool IsVerified { get; set; }
    public bool IsContributor { get; set; }
    public DateTime? ContributorSince { get; set; }
    public decimal? ContributorRating { get; set; }

    public ICollection<MainDeal> OrganizedDeals { get; set; } = new List<MainDeal>();
    public ICollection<MainDealOrder> Orders { get; set; } = new List<MainDealOrder>();
    public ICollection<MainSavedList> SavedLists { get; set; } = new List<MainSavedList>();
    public ICollection<MainSavedDeal> SavedDeals { get; set; } = new List<MainSavedDeal>();
    public ICollection<MainNotification> Notifications { get; set; } = new List<MainNotification>();
    public ICollection<MainPushToken> PushTokens { get; set; } = new List<MainPushToken>();
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
    public ICollection<MainSavedDeal> SavedDeals { get; set; } = new List<MainSavedDeal>();
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

// ── New Entity Classes ─────────────────────────────────────────────────────────

public class MainSavedList
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = "";
    public bool IsPublic { get; set; }
    public DateTime CreatedAt { get; set; }

    public MainUser? User { get; set; }
    public ICollection<MainSavedDeal> SavedDeals { get; set; } = new List<MainSavedDeal>();
}

public class MainSavedDeal
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid DealId { get; set; }
    public Guid ListId { get; set; }
    public DateTime SavedAt { get; set; }

    public MainUser? User { get; set; }
    public MainDeal? Deal { get; set; }
    public MainSavedList? List { get; set; }
}

public class MainNotification
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Type { get; set; } = "";
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    public string? DataJson { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }

    public MainUser? User { get; set; }
}

public class MainConversation
{
    public Guid Id { get; set; }
    public Guid? DealId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastMessageAt { get; set; }
    public Guid? LastMessageId { get; set; }

    public ICollection<MainConversationParticipant> Participants { get; set; } = new List<MainConversationParticipant>();
    public ICollection<MainChatMessage> Messages { get; set; } = new List<MainChatMessage>();
}

public class MainConversationParticipant
{
    public Guid Id { get; set; }
    public Guid ConversationId { get; set; }
    public Guid UserId { get; set; }
    public DateTime? LastReadAt { get; set; }

    public MainConversation? Conversation { get; set; }
    public MainUser? User { get; set; }
}

public class MainChatMessage
{
    public Guid Id { get; set; }
    public Guid ConversationId { get; set; }
    public Guid SenderId { get; set; }
    public string Content { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public bool IsRead { get; set; }

    public MainConversation? Conversation { get; set; }
    public MainUser? Sender { get; set; }
}

public class MainPushToken
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Token { get; set; } = "";
    public string Platform { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public DateTime? LastUsedAt { get; set; }
    public bool IsActive { get; set; } = true;

    public MainUser? User { get; set; }
}

public class MainUserFollow
{
    public Guid Id { get; set; }
    public Guid FollowerId { get; set; }
    public Guid FollowingId { get; set; }
    public DateTime CreatedAt { get; set; }

    public MainUser? Follower { get; set; }
    public MainUser? Following { get; set; }
}

public class MainDealComment
{
    public Guid Id { get; set; }
    public Guid DealId { get; set; }
    public Guid UserId { get; set; }
    public string Content { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool IsHidden { get; set; }
    public string ModerationStatus { get; set; } = "Approved";

    public MainDeal? Deal { get; set; }
    public MainUser? User { get; set; }
}

public class MainContributorApplication
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Status { get; set; } = "Pending";
    public string? RejectionReason { get; set; }
    public string MobileNo { get; set; } = "";
    public string IcPassportNo { get; set; } = "";
    public string Nationality { get; set; } = "";
    public string Race { get; set; } = "";
    public string ResidentStatus { get; set; } = "";
    public int? ReviewedBy { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ApprovedAt { get; set; }

    public MainUser? User { get; set; }
}
