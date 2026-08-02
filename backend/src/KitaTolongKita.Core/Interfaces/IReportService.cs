using KitaTolongKita.Core.Entities;

namespace KitaTolongKita.Core.Interfaces;

public interface IReportService
{
    /// <summary>Submit a new report. Throws ConflictException if an unresolved report already exists.</summary>
    Task<ReportDto> SubmitAsync(Guid reporterId, CreateReportRequest request);

    /// <summary>List reports visible to admins with optional filters.</summary>
    Task<(List<ReportDto> Items, int Total)> ListAsync(ReportFilter filter);

    /// <summary>Get a single report by ID.</summary>
    Task<ReportDetailDto?> GetByIdAsync(Guid reportId);

    /// <summary>Admin takes action on a report and optionally applies a corrective action.</summary>
    Task<ReportDto> TakeActionAsync(Guid reportId, Guid adminId, TakeReportActionRequest request);

    /// <summary>Admin updates report status without taking a deal/user action.</summary>
    Task<ReportDto> UpdateStatusAsync(Guid reportId, Guid adminId, ReportStatus status, string? notes);

    /// <summary>List reports filed by a specific user (for mobile "My Reports").</summary>
    Task<List<ReportDto>> GetByReporterAsync(Guid reporterId);
}

public record CreateReportRequest(
    ReportType Type,
    Guid TargetId,
    List<ReportReason> Reasons,
    string? Description
);

public record ReportFilter(
    ReportStatus? Status = null,
    ReportType? Type = null,
    ReportReason? Reason = null,
    DateTime? From = null,
    DateTime? To = null,
    int Page = 1,
    int PageSize = 20
);

public record TakeReportActionRequest(
    ReportAction Action,
    string? Notes
);

public record ReportDto(
    Guid Id,
    ReportType Type,
    Guid TargetId,
    string? TargetTitle,
    Guid ReporterId,
    string? ReporterName,
    List<ReportReason> Reasons,
    string? Description,
    ReportStatus Status,
    ReportAction Action,
    string? AdminNotes,
    DateTime? ResolvedAt,
    DateTime CreatedAt
);

public record ReportDetailDto(
    Guid Id,
    ReportType Type,
    Guid TargetId,
    string? TargetTitle,
    Guid ReporterId,
    string? ReporterName,
    List<ReportReason> Reasons,
    string? Description,
    ReportStatus Status,
    ReportAction Action,
    string? AdminNotes,
    DateTime? ResolvedAt,
    DateTime CreatedAt,
    string? DealDescription,
    string? DealImageUrl,
    decimal? DealGroupPrice,
    string? DealPickupLocation,
    string? TargetUserName,
    string? TargetUserEmail,
    Guid? ResolvedById
) : ReportDto(Id, Type, TargetId, TargetTitle, ReporterId, ReporterName, Reasons, Description, Status, Action, AdminNotes, ResolvedAt, CreatedAt);
