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
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<ConversationParticipant> ConversationParticipants => Set<ConversationParticipant>();
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
    public DbSet<UserNotification> UserNotifications => Set<UserNotification>();
    public DbSet<PushToken> PushTokens => Set<PushToken>();
    public DbSet<NotificationPreference> NotificationPreferences => Set<NotificationPreference>();
    public DbSet<Report> Reports => Set<Report>();
    public DbSet<SavedList> SavedLists => Set<SavedList>();
    public DbSet<SavedDeal> SavedDeals => Set<SavedDeal>();

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
    }
}
