using Microsoft.EntityFrameworkCore;
using KitaTolongKita.Admin.Api.Entities;

namespace KitaTolongKita.Admin.Api.Data;

public class AdminDbContext : DbContext
{
    public AdminDbContext(DbContextOptions<AdminDbContext> opts) : base(opts) { }

    public DbSet<AdminUser> AdminUsers => Set<AdminUser>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<AppSetting> AppSettings => Set<AppSetting>();

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

        // Seed default app settings
        m.Entity<AppSetting>().HasData(
            new AppSetting { Id = 1, Key = "PilotMode:Enabled", Value = "true", UpdatedByAdminId = 1 },
            new AppSetting { Id = 2, Key = "PilotMode:SkipEmailVerification", Value = "true", UpdatedByAdminId = 1 },
            new AppSetting { Id = 3, Key = "PilotMode:AutoApproveDeals", Value = "true", UpdatedByAdminId = 1 },
            new AppSetting { Id = 4, Key = "PilotMode:BypassModeration", Value = "true", UpdatedByAdminId = 1 },
            new AppSetting { Id = 5, Key = "AI:Provider", Value = "azure-openai", UpdatedByAdminId = 1 },
            new AppSetting { Id = 6, Key = "AI:AutoApproveThreshold", Value = "80", UpdatedByAdminId = 1 },
            new AppSetting { Id = 7, Key = "AI:PendingReviewThreshold", Value = "50", UpdatedByAdminId = 1 },
            new AppSetting { Id = 8, Key = "Deal:MinGroupSize", Value = "5", UpdatedByAdminId = 1 },
            new AppSetting { Id = 9, Key = "Deal:MaxGroupSize", Value = "100", UpdatedByAdminId = 1 }
        );

        base.OnModelCreating(m);
    }
}
