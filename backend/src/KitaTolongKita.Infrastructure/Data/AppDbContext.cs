using Microsoft.EntityFrameworkCore;
using KitaTolongKita.Core.Entities;

namespace KitaTolongKita.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<UserAddress> UserAddresses => Set<UserAddress>();
    public DbSet<Deal> Deals => Set<Deal>();
    public DbSet<DealOrder> DealOrders => Set<DealOrder>();
    public DbSet<OtpCode> OtpCodes => Set<OtpCode>();
    public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<ConversationParticipant> ConversationParticipants => Set<ConversationParticipant>();
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
    public DbSet<UserNotification> UserNotifications => Set<UserNotification>();
    public DbSet<PushToken> PushTokens => Set<PushToken>();
    public DbSet<NotificationPreference> NotificationPreferences => Set<NotificationPreference>();
    public DbSet<Report> Reports => Set<Report>();
    public DbSet<SavedList> SavedLists => Set<SavedList>();
    public DbSet<SavedDeal> SavedDeals => Set<SavedDeal>();
    public DbSet<UserFollow> UserFollows => Set<UserFollow>();
    public DbSet<DealComment> DealComments => Set<DealComment>();
    public DbSet<DealRepost> DealReposts => Set<DealRepost>();
    public DbSet<UserNotificationPreference> UserNotificationPreferences => Set<UserNotificationPreference>();
    public DbSet<ContributorApplication> ContributorApplications => Set<ContributorApplication>();
    public DbSet<DealLookup> DealLookups => Set<DealLookup>();
    public DbSet<ContributorRating> ContributorRatings => Set<ContributorRating>();

    // ── Admin Portal Tables ────────────────────────────────────────────────────
    public DbSet<AdminUser> AdminUsers => Set<AdminUser>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<AppSetting> AppSettings => Set<AppSetting>();
    public DbSet<AiConfig> AiConfigs => Set<AiConfig>();
    public DbSet<ModerationRule> ModerationRules => Set<ModerationRule>();
    public DbSet<Category> Categories => Set<Category>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(e => e.Email).IsUnique();
            entity.HasIndex(e => e.GoogleId);
            entity.Property(e => e.Email).IsRequired();
            entity.Property(e => e.FullName).IsRequired();
        });

        modelBuilder.Entity<Deal>(entity =>
        {
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.Category);
            entity.HasIndex(e => e.Deadline);
            entity.Property(e => e.Title).IsRequired();
            entity.Property(e => e.GroupPrice).HasPrecision(10, 2);
            entity.Property(e => e.OriginalPrice).HasPrecision(10, 2);
            entity.HasOne(d => d.Organizer)
                  .WithMany()
                  .HasForeignKey(d => d.OrganizerId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<DealOrder>(entity =>
        {
            entity.HasIndex(e => e.BuyerId);
            entity.HasIndex(e => e.DealId);
            entity.Property(e => e.TotalPrice).HasPrecision(10, 2);
        });

        modelBuilder.Entity<OtpCode>(entity =>
        {
            entity.HasIndex(e => new { e.Email, e.Code, e.Used });
            entity.Property(e => e.Code).IsRequired();
        });

        modelBuilder.Entity<PushToken>(entity =>
        {
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.Token).IsUnique();
        });

        modelBuilder.Entity<NotificationPreference>(entity =>
        {
            entity.HasIndex(e => e.UserId).IsUnique();
        });

        modelBuilder.Entity<UserNotification>(entity =>
        {
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => new { e.UserId, e.IsRead });
        });

        modelBuilder.Entity<Report>(entity =>
        {
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.Type);
            entity.HasIndex(e => e.TargetId);
            entity.HasIndex(e => e.ReporterId);
            entity.HasIndex(e => new { e.ReporterId, e.TargetId, e.Status });

            // Store ReportReason as a comma-separated string for SQLite compatibility
            entity.Property(e => e.Reasons)
                  .HasConversion(
                      reasons => string.Join(',', reasons.Select(r => r.ToString())),
                      str => string.IsNullOrEmpty(str)
                          ? new List<ReportReason>()
                          : str.Split(',', StringSplitOptions.RemoveEmptyEntries)
                                .Select(r => Enum.Parse<ReportReason>(r)).ToList()
                  );
        });

        modelBuilder.Entity<SavedList>(entity =>
        {
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => new { e.UserId, e.Name }).IsUnique();
            entity.Property(e => e.Name).IsRequired().HasMaxLength(30);
            entity.HasOne(e => e.User)
                  .WithMany(u => u.SavedLists)
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SavedDeal>(entity =>
        {
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.DealId);
            entity.HasIndex(e => e.ListId);
            entity.HasIndex(e => new { e.DealId, e.UserId, e.ListId }).IsUnique();
            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Deal)
                  .WithMany()
                  .HasForeignKey(e => e.DealId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.List)
                  .WithMany(l => l.SavedDeals)
                  .HasForeignKey(e => e.ListId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ── User Follows ──────────────────────────────────────────────────────────────
        modelBuilder.Entity<UserFollow>(entity =>
        {
            entity.HasIndex(e => new { e.FollowerId, e.FollowingId }).IsUnique();
            entity.HasIndex(e => e.FollowingId);
            entity.HasIndex(e => e.FollowerId);
            entity.HasOne(e => e.Follower)
                  .WithMany(u => u.Following)
                  .HasForeignKey(e => e.FollowerId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Following)
                  .WithMany(u => u.Followers)
                  .HasForeignKey(e => e.FollowingId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Deal Comments ────────────────────────────────────────────────────────────
        modelBuilder.Entity<DealComment>(entity =>
        {
            entity.HasIndex(e => new { e.DealId, e.CreatedAt });
            entity.HasIndex(e => e.UserId);
            entity.Property(e => e.Content).HasMaxLength(500).IsRequired();
            entity.HasOne(e => e.Deal)
                  .WithMany(d => d.Comments)
                  .HasForeignKey(e => e.DealId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Parent)
                  .WithMany(r => r.Replies)
                  .HasForeignKey(e => e.ParentId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // ── Deal Reposts ─────────────────────────────────────────────────────────────
        modelBuilder.Entity<DealRepost>(entity =>
        {
            entity.HasIndex(e => new { e.DealId, e.UserId }).IsUnique();
            entity.HasIndex(e => e.UserId);
            entity.HasOne(e => e.Deal)
                  .WithMany(d => d.Reposts)
                  .HasForeignKey(e => e.DealId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ── User Notification Preferences ───────────────────────────────────────────
        modelBuilder.Entity<UserNotificationPreference>(entity =>
        {
            entity.HasIndex(e => e.UserId).IsUnique();
            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Contributor Applications ────────────────────────────────────────────────
        modelBuilder.Entity<ContributorApplication>(entity =>
        {
            entity.HasIndex(e => e.UserId).IsUnique();
            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Deal Lookups ──────────────────────────────────────────────────────────
        modelBuilder.Entity<DealLookup>(entity =>
        {
            entity.HasIndex(e => new { e.DealId, e.UserId }).IsUnique();
            entity.HasIndex(e => e.BookingId).IsUnique();
            entity.HasIndex(e => e.DealId);
            entity.HasIndex(e => e.Status);
            entity.HasOne(e => e.Deal)
                  .WithMany()
                  .HasForeignKey(e => e.DealId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Contributor Ratings ───────────────────────────────────────────────────
        modelBuilder.Entity<ContributorRating>(entity =>
        {
            entity.HasIndex(e => e.LookupId).IsUnique(); // one rating per lookup
            entity.HasIndex(e => e.ContributorId);
            entity.HasOne(e => e.Lookup)
                  .WithMany()
                  .HasForeignKey(e => e.LookupId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Deal)
                  .WithMany()
                  .HasForeignKey(e => e.DealId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Contributor)
                  .WithMany()
                  .HasForeignKey(e => e.ContributorId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Reviewer)
                  .WithMany()
                  .HasForeignKey(e => e.ReviewerId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ═══════════════════════════════════════════════════════════════════════════
        // ADMIN PORTAL TABLES
        // ═══════════════════════════════════════════════════════════════════════════

        modelBuilder.Entity<AdminUser>(e =>
        {
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.Role).HasDefaultValue("Viewer");
            e.Property(x => x.IsActive).HasDefaultValue(true);
        });

        modelBuilder.Entity<AuditLog>(e =>
        {
            e.HasIndex(x => x.CreatedAt);
            e.HasIndex(x => new { x.EntityType, x.EntityId });
        });

        modelBuilder.Entity<AppSetting>(e =>
        {
            e.HasIndex(x => x.Key).IsUnique();
        });

        modelBuilder.Entity<AiConfig>(e =>
        {
            e.HasIndex(x => x.Name).IsUnique();
            e.HasIndex(x => x.IsActive);
        });

        modelBuilder.Entity<ModerationRule>(e =>
        {
            e.HasIndex(x => x.Key).IsUnique();
            e.HasIndex(x => x.Category);
        });

        modelBuilder.Entity<Category>(e =>
        {
            e.HasIndex(x => x.Name).IsUnique();
        });

        // ── Seed: default super admin ──────────────────────────────────────────
        modelBuilder.Entity<AdminUser>().HasData(new AdminUser
        {
            Id = 1,
            Email = "admin@kitatolongkita.com",
            FullName = "Super Admin",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
            Role = "SuperAdmin",
            IsActive = true,
            CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
        });

        // ── Seed: AI configs ───────────────────────────────────────────────────
        modelBuilder.Entity<AiConfig>().HasData(
            new AiConfig { Id = 1, Name = "Azure OpenAI (Default)", Provider = "azure-openai", IsActive = true,  CreatedAt = new DateTime(2024,1,1,0,0,0,DateTimeKind.Utc), UpdatedAt = new DateTime(2024,1,1,0,0,0,DateTimeKind.Utc), CreatedByAdminId = 1 },
            new AiConfig { Id = 2, Name = "OpenAI Direct",              Provider = "openai",       IsActive = false, CreatedAt = new DateTime(2024,1,1,0,0,0,DateTimeKind.Utc), UpdatedAt = new DateTime(2024,1,1,0,0,0,DateTimeKind.Utc), CreatedByAdminId = 1 },
            new AiConfig { Id = 3, Name = "Anthropic Claude",            Provider = "anthropic",    IsActive = false, CreatedAt = new DateTime(2024,1,1,0,0,0,DateTimeKind.Utc), UpdatedAt = new DateTime(2024,1,1,0,0,0,DateTimeKind.Utc), CreatedByAdminId = 1 }
        );

        // ── Seed: moderation rules ─────────────────────────────────────────────
        modelBuilder.Entity<ModerationRule>().HasData(
            new ModerationRule { Id = 1, Key = "auto_approve_threshold",    Value = "80",  Description = "AI score >= 80 → auto-approve",         Category = "ai",    IsActive = true, UpdatedByAdminId = 1 },
            new ModerationRule { Id = 2, Key = "pending_review_threshold",  Value = "50",  Description = "AI score 50-79 → pending manual review", Category = "ai",    IsActive = true, UpdatedByAdminId = 1 },
            new ModerationRule { Id = 3, Key = "reject_threshold",          Value = "50",  Description = "AI score < 50 → auto-reject",            Category = "ai",    IsActive = true, UpdatedByAdminId = 1 },
            new ModerationRule { Id = 4, Key = "pilot_mode_enabled",            Value = "true",  Description = "Enable pilot mode (skip OTP, auto-approve deals)", Category = "pilot", IsActive = true, UpdatedByAdminId = 1 },
            new ModerationRule { Id = 5, Key = "pilot_skip_email_verification", Value = "true",  Description = "Skip email verification during pilot",   Category = "pilot", IsActive = true, UpdatedByAdminId = 1 },
            new ModerationRule { Id = 6, Key = "pilot_auto_approve_deals",      Value = "true",  Description = "Auto-approve all deals during pilot",     Category = "pilot", IsActive = true, UpdatedByAdminId = 1 },
            new ModerationRule { Id = 7, Key = "deal_min_group_size",           Value = "5",    Description = "Minimum group size for a deal",            Category = "deal",  IsActive = true, UpdatedByAdminId = 1 },
            new ModerationRule { Id = 8, Key = "deal_max_group_size",           Value = "100",  Description = "Maximum group size for a deal",           Category = "deal",  IsActive = true, UpdatedByAdminId = 1 }
        );

        // ── Seed: categories ───────────────────────────────────────────────────
        modelBuilder.Entity<Category>().HasData(
            new Category { Id = 1, Name = "Food & Beverages",    Description = "Food deals, group orders, restaurant vouchers",      IsActive = true, CreatedAt = new DateTime(2024,1,1,0,0,0,DateTimeKind.Utc) },
            new Category { Id = 2, Name = "Fashion",            Description = "Clothing, accessories, footwear",                     IsActive = true, CreatedAt = new DateTime(2024,1,1,0,0,0,DateTimeKind.Utc) },
            new Category { Id = 3, Name = "Electronics",        Description = "Gadgets, devices, accessories",                     IsActive = true, CreatedAt = new DateTime(2024,1,1,0,0,0,DateTimeKind.Utc) },
            new Category { Id = 4, Name = "Beauty & Personal Care", Description = "Skincare, cosmetics, wellness",                  IsActive = true, CreatedAt = new DateTime(2024,1,1,0,0,0,DateTimeKind.Utc) },
            new Category { Id = 5, Name = "Home & Living",      Description = "Furniture, decor, household items",                 IsActive = true, CreatedAt = new DateTime(2024,1,1,0,0,0,DateTimeKind.Utc) },
            new Category { Id = 6, Name = "Sports & Outdoors",  Description = "Sports equipment, outdoor gear",                  IsActive = true, CreatedAt = new DateTime(2024,1,1,0,0,0,DateTimeKind.Utc) },
            new Category { Id = 7, Name = "Education",          Description = "Books, courses, tutoring",                          IsActive = true, CreatedAt = new DateTime(2024,1,1,0,0,0,DateTimeKind.Utc) },
            new Category { Id = 8, Name = "Services",           Description = "Professional services, freelance",                  IsActive = true, CreatedAt = new DateTime(2024,1,1,0,0,0,DateTimeKind.Utc) },
            new Category { Id = 9, Name = "Others",             Description = "Miscellaneous deals",                              IsActive = true, CreatedAt = new DateTime(2024,1,1,0,0,0,DateTimeKind.Utc) }
        );
    }
}
