using Microsoft.EntityFrameworkCore;
using KitaTolongKita.Admin.Api.Entities;

namespace KitaTolongKita.Admin.Api.Data;

namespace KitaTolongKita.Admin.Api.Data;

public class AdminDbContext : DbContext
{
    public AdminDbContext(DbContextOptions<AdminDbContext> opts) : base(opts) { }

    public DbSet<AdminUser> AdminUsers => Set<AdminUser>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<AppSetting> AppSettings => Set<AppSetting>();
    public DbSet<AiConfig> AiConfigs => Set<AiConfig>();
    public DbSet<ModerationRule> ModerationRules => Set<ModerationRule>();
    public DbSet<Category> Categories => Set<Category>();

    protected override void OnModelCreating(ModelBuilder m)
    {
        m.Entity<AdminUser>(e =>
        {
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.Role).HasDefaultValue("Viewer");
            e.Property(x => x.IsActive).HasDefaultValue(true);
        });

        m.Entity<AuditLog>(e =>
        {
            e.HasIndex(x => x.CreatedAt);
            e.HasIndex(x => new { x.EntityType, x.EntityId });
        });

        m.Entity<AppSetting>(e =>
        {
            e.HasIndex(x => x.Key).IsUnique();
        });

        m.Entity<AiConfig>(e =>
        {
            e.HasIndex(x => x.Name).IsUnique();
            e.HasIndex(x => x.IsActive);
        });

        m.Entity<ModerationRule>(e =>
        {
            e.HasIndex(x => x.Key).IsUnique();
            e.HasIndex(x => x.Category);
        });

        m.Entity<Category>(e =>
        {
            e.HasIndex(x => x.Name).IsUnique();
        });

        // Seed default super admin
        m.Entity<AdminUser>().HasData(new AdminUser
        {
            Id = 1,
            Email = "admin@kitatolongkita.com",
            FullName = "Super Admin",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
            Role = "SuperAdmin",
            IsActive = true,
            CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
        });

        // Seed AI configs (sample — admin can add more)
        m.Entity<AiConfig>().HasData(
            new AiConfig { Id = 1, Name = "Azure OpenAI (Default)", Provider = "azure-openai", IsActive = true, CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc), UpdatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc), CreatedByAdminId = 1 },
            new AiConfig { Id = 2, Name = "OpenAI Direct", Provider = "openai", IsActive = false, CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc), UpdatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc), CreatedByAdminId = 1 },
            new AiConfig { Id = 3, Name = "Anthropic Claude", Provider = "anthropic", IsActive = false, CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc), UpdatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc), CreatedByAdminId = 1 }
        );

        // Seed moderation rules
        m.Entity<ModerationRule>().HasData(
            new ModerationRule { Id = 1, Key = "auto_approve_threshold", Value = "80", Description = "AI score >= 80 → auto-approve", Category = "ai", IsActive = true, UpdatedByAdminId = 1 },
            new ModerationRule { Id = 2, Key = "pending_review_threshold", Value = "50", Description = "AI score 50-79 → pending manual review", Category = "ai", IsActive = true, UpdatedByAdminId = 1 },
            new ModerationRule { Id = 3, Key = "reject_threshold", Value = "50", Description = "AI score < 50 → auto-reject", Category = "ai", IsActive = true, UpdatedByAdminId = 1 },
            new ModerationRule { Id = 4, Key = "pilot_mode_enabled", Value = "true", Description = "Enable pilot mode (skip OTP, auto-approve deals)", Category = "pilot", IsActive = true, UpdatedByAdminId = 1 },
            new ModerationRule { Id = 5, Key = "pilot_skip_email_verification", Value = "true", Description = "Skip email verification during pilot", Category = "pilot", IsActive = true, UpdatedByAdminId = 1 },
            new ModerationRule { Id = 6, Key = "pilot_auto_approve_deals", Value = "true", Description = "Auto-approve all deals during pilot", Category = "pilot", IsActive = true, UpdatedByAdminId = 1 },
            new ModerationRule { Id = 7, Key = "deal_min_group_size", Value = "5", Description = "Minimum group size for a deal", Category = "deal", IsActive = true, UpdatedByAdminId = 1 },
            new ModerationRule { Id = 8, Key = "deal_max_group_size", Value = "100", Description = "Maximum group size for a deal", Category = "deal", IsActive = true, UpdatedByAdminId = 1 }
        );

        // Seed default categories
        m.Entity<Category>().HasData(
            new Category { Id = 1, Name = "Food & Beverages", Description = "Food deals, group orders, restaurant vouchers", IsActive = true, CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Category { Id = 2, Name = "Fashion", Description = "Clothing, accessories, footwear", IsActive = true, CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Category { Id = 3, Name = "Electronics", Description = "Gadgets, devices, accessories", IsActive = true, CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Category { Id = 4, Name = "Beauty & Personal Care", Description = "Skincare, cosmetics, wellness", IsActive = true, CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Category { Id = 5, Name = "Home & Living", Description = "Furniture, decor, household items", IsActive = true, CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Category { Id = 6, Name = "Sports & Outdoors", Description = "Sports equipment, outdoor gear", IsActive = true, CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Category { Id = 7, Name = "Education", Description = "Books, courses, tutoring", IsActive = true, CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Category { Id = 8, Name = "Services", Description = "Professional services, freelance", IsActive = true, CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Category { Id = 9, Name = "Others", Description = "Miscellaneous deals", IsActive = true, CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) }
        );

        base.OnModelCreating(m);
    }
}
