using Microsoft.EntityFrameworkCore;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Core.Interfaces;
using KitaTolongKita.Infrastructure.Data;

namespace KitaTolongKita.Infrastructure.Services;

public class ReportService : IReportService
{
    private readonly AppDbContext _db;
    private readonly IElasticsearchService _es;
    private readonly ILogger<ReportService> _logger;

    public ReportService(AppDbContext db, IElasticsearchService es, ILogger<ReportService> logger)
    {
        _db = db;
        _es = es;
        _logger = logger;
    }

    public async Task<ReportDto> SubmitAsync(Guid reporterId, CreateReportRequest request)
    {
        // Validate target exists
        if (request.Type == ReportType.Deal)
        {
            var dealExists = await _db.Deals.AnyAsync(d => d.Id == request.TargetId);
            if (!dealExists) throw new InvalidOperationException("Deal not found.");
        }
        else
        {
            var userExists = await _db.Users.AnyAsync(u => u.Id == request.TargetId);
            if (!userExists) throw new InvalidOperationException("User not found.");
        }

        // Prevent duplicate: same reporter + same target with unresolved status
        var existing = await _db.Reports.FirstOrDefaultAsync(r =>
            r.ReporterId == reporterId &&
            r.TargetId == request.TargetId &&
            r.Type == request.Type &&
            !r.IsResolved);
        if (existing != null)
            throw new InvalidOperationException("You have already submitted an unresolved report for this content.");

        var report = new Report
        {
            Type = request.Type,
            TargetId = request.TargetId,
            ReporterId = reporterId,
            Reasons = request.Reasons,
            Description = request.Description,
            Status = ReportStatus.New,
        };

        _db.Reports.Add(report);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Report {ReportId} submitted by user {UserId} against {Type} {TargetId}",
            report.Id, reporterId, request.Type, request.TargetId);

        return ToDto(report);
    }

    public async Task<List<ReportDto>> GetByReporterAsync(Guid reporterId)
    {
        var reports = await _db.Reports
            .Where(r => r.ReporterId == reporterId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();
        return reports.Select(r => ToDto(r)).ToList();
    }

    public async Task<(List<ReportDto> Items, int Total)> ListAsync(ReportFilter filter)
    {
        var query = _db.Reports
            .Include(r => r.Reporter)
            .AsQueryable();

        if (filter.Status.HasValue)
            query = query.Where(r => r.Status == filter.Status.Value);
        if (filter.Type.HasValue)
            query = query.Where(r => r.Type == filter.Type.Value);
        if (filter.From.HasValue)
            query = query.Where(r => r.CreatedAt >= filter.From.Value);
        if (filter.To.HasValue)
            query = query.Where(r => r.CreatedAt <= filter.To.Value);
        if (filter.Reason.HasValue)
            query = query.Where(r => r.Reasons.Contains(filter.Reason.Value));

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(r => r.Status == ReportStatus.New)
            .ThenByDescending(r => r.CreatedAt)
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync();

        return (items.Select(r => ToDto(r)).ToList(), total);
    }

    public async Task<ReportDetailDto?> GetByIdAsync(Guid reportId)
    {
        var r = await _db.Reports
            .Include(r => r.Reporter)
            .FirstOrDefaultAsync(x => x.Id == reportId);
        if (r == null) return null;

        string? dealTitle = null, dealDesc = null, dealImg = null, dealLoc = null;
        decimal? dealPrice = null;
        string? userName = null, userEmail = null;

        if (r.Type == ReportType.Deal)
        {
            var deal = await _db.Deals.FindAsync(r.TargetId);
            if (deal != null)
            {
                dealTitle = deal.Title;
                dealDesc = deal.Description;
                dealImg = deal.ImageUrls?.FirstOrDefault();
                dealPrice = deal.GroupPrice;
                dealLoc = deal.PickupLocation;
            }
        }
        else
        {
            var user = await _db.Users.FindAsync(r.TargetId);
            if (user != null)
            {
                userName = user.FullName;
                userEmail = user.Email;
            }
        }

        var dto = ToDetailDto(r);
        // Fill extra detail fields via object initializer
        return dto with
        {
            DealDescription = dealDesc,
            DealImageUrl = dealImg,
            DealGroupPrice = dealPrice,
            DealPickupLocation = dealLoc,
            TargetUserName = userName,
            TargetUserEmail = userEmail,
            ResolvedById = r.ResolvedById,
        };
    }

    public async Task<ReportDto> TakeActionAsync(Guid reportId, Guid adminId, TakeReportActionRequest request)
    {
        var report = await _db.Reports.FindAsync(reportId);
        if (report == null) throw new InvalidOperationException("Report not found.");

        report.Action = request.Action;
        report.AdminNotes = request.Notes;
        report.Status = ReportStatus.ActionTaken;
        report.ResolvedById = adminId;
        report.ResolvedAt = DateTime.UtcNow;

        // Apply the corrective action
        if (request.Action == ReportAction.DealHidden && report.Type == ReportType.Deal)
        {
            var deal = await _db.Deals.FindAsync(report.TargetId);
            if (deal != null)
            {
                deal.Status = DealStatus.Hidden;
                try { await _es.UpdateDealAsync(deal); }
                catch (Exception ex) { _logger.LogWarning(ex, "ES update failed after hiding deal {DealId}", deal.Id); }
            }
        }
        else if (request.Action == ReportAction.PostingRevoked && report.Type == ReportType.User)
        {
            var user = await _db.Users.FindAsync(report.TargetId);
            if (user != null) user.Status = UserStatus.PostingAccessRevoked;
        }
        else if (request.Action == ReportAction.AccountSuspended && report.Type == ReportType.User)
        {
            var user = await _db.Users.FindAsync(report.TargetId);
            if (user != null) user.Status = UserStatus.Suspended;
        }
        else if (request.Action == ReportAction.AccountBanned && report.Type == ReportType.User)
        {
            var user = await _db.Users.FindAsync(report.TargetId);
            if (user != null) user.Status = UserStatus.Deleted;
        }
        // UserWarned and NoAction don't change entity state

        await _db.SaveChangesAsync();

        _logger.LogInformation(
            "Admin {AdminId} took action {Action} on report {ReportId} against {Type} {TargetId}",
            adminId, request.Action, reportId, report.Type, report.TargetId);

        return ToDto(report);
    }

    public async Task<ReportDto> UpdateStatusAsync(Guid reportId, Guid adminId, ReportStatus status, string? notes)
    {
        var report = await _db.Reports.FindAsync(reportId);
        if (report == null) throw new InvalidOperationException("Report not found.");

        report.Status = status;
        if (notes != null) report.AdminNotes = notes;
        report.ResolvedById = adminId;
        if (status == ReportStatus.Resolved || status == ReportStatus.Dismissed)
            report.ResolvedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return ToDto(report);
    }

    // ── DTO Helpers ───────────────────────────────────────────────────────────

    private static ReportDto ToDto(Report r) => new(
        r.Id, r.Type, r.TargetId,
        TargetTitle: null, // filled in detail dto
        r.ReporterId,
        ReporterName: r.Reporter?.FullName,
        r.Reasons, r.Description,
        r.Status, r.Action, r.AdminNotes,
        r.ResolvedAt, r.CreatedAt
    );

    private static ReportDetailDto ToDetailDto(Report r) => new(
        r.Id, r.Type, r.TargetId,
        TargetTitle: null,
        r.ReporterId,
        ReporterName: r.Reporter?.FullName,
        r.Reasons, r.Description,
        r.Status, r.Action, r.AdminNotes,
        r.ResolvedAt, r.CreatedAt
    );
}
