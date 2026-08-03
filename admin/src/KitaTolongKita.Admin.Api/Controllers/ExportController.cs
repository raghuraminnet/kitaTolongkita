using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitaTolongKita.Admin.Api.Services;

namespace KitaTolongKita.Admin.Api.Controllers;

[ApiController]
[Route("api/export")]
[Authorize(Policy = "Moderator")]
public class ExportController : ControllerBase
{
    private readonly IAdminService _svc;
    public ExportController(IAdminService svc) => _svc = svc;

    [HttpGet("users")]
    public async Task<IActionResult> ExportUsers()
    {
        var result = await _svc.GetUsersAsync(null, null, 1, 10000);
        var rows = result.Items.Select(u => new
        {
            Id = u.Id,
            u.Email,
            u.FullName,
            AvatarUrl = u.AvatarUrl ?? "",
            EmailVerified = u.EmailVerified ? "Yes" : "No",
            IsActive = u.IsActive ? "Yes" : "No",
            u.CreatedAt,
            LastLogin = (DateTime?)null
        }).ToList();

        var csv = GenerateCsv(rows);
        return File(System.Text.Encoding.UTF8.GetBytes(csv), "text/csv", $"users_export_{DateTime.UtcNow:yyyyMMdd}.csv");
    }

    [HttpGet("deals")]
    public async Task<IActionResult> ExportDeals([FromQuery] string? status)
    {
        var result = await _svc.GetAllDealsAsync(status, null, 1, 10000);
        var rows = result.Items.Select(d => new
        {
            Id = d.Id,
            Title = d.Title,
            Category = d.Category,
            Organizer = d.OrganizerName,
            OrganizerEmail = "",
            GroupPrice = d.GroupPrice,
            MinMembers = d.MinGroup,
            CurrentMembers = d.CurrentGroup,
            Status = d.Status,
            ModerationStatus = d.Status,
            IsFeatured = d.IsFeatured ? "Yes" : "No",
            CreatedAt = d.CreatedAt
        }).ToList();

        var csv = GenerateCsv(rows);
        return File(System.Text.Encoding.UTF8.GetBytes(csv), "text/csv", $"deals_export_{DateTime.UtcNow:yyyyMMdd}.csv");
    }

    [HttpGet("orders")]
    public async Task<IActionResult> ExportOrders([FromQuery] string? status)
    {
        var result = await _svc.GetOrdersAsync(status, null, 1, 10000);
        var rows = result.Items.Select(o => new
        {
            Id = o.Id,
            BuyerName = o.BuyerName,
            BuyerEmail = o.BuyerEmail,
            DealTitle = o.DealTitle,
            Quantity = o.Quantity,
            TotalPrice = o.Amount,
            Status = o.Status,
            CreatedAt = o.CreatedAt,
            UpdatedAt = (DateTime?)null
        }).ToList();

        var csv = GenerateCsv(rows);
        return File(System.Text.Encoding.UTF8.GetBytes(csv), "text/csv", $"orders_export_{DateTime.UtcNow:yyyyMMdd}.csv");
    }

    private static string GenerateCsv<T>(List<T> data)
    {
        if (data.Count == 0) return "";
        var props = typeof(T).GetProperties();
        var header = string.Join(",", props.Select(p => EscapeCsv(p.Name)));
        var rows = data.Select(row => string.Join(",", props.Select(p =>
        {
            var val = p.GetValue(row)?.ToString() ?? "";
            return EscapeCsv(val);
        })));
        return header + "\n" + string.Join("\n", rows);
    }

    private static string EscapeCsv(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
            return $"\"{value.Replace("\"", "\"\"")}\"";
        return value;
    }
}
