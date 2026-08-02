using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KitaTolongKita.Admin.Api.Data;
using KitaTolongKita.Admin.Api.DTOs;

namespace KitaTolongKita.Admin.Api.Controllers;

[ApiController]
[Route("api/export")]
[Authorize(Policy = "Moderator")]
public class ExportController : ControllerBase
{
    private readonly MainDbContext _mainDb;
    private readonly AdminDbContext _adminDb;

    public ExportController(MainDbContext mainDb, AdminDbContext adminDb)
    {
        _mainDb = mainDb;
        _adminDb = adminDb;
    }

    [HttpGet("users")]
    public async Task<IActionResult> ExportUsers()
    {
        var users = await _mainDb.Users.AsNoTracking()
            .OrderBy(u => u.CreatedAt)
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.FullName,
                u.Phone,
                EmailVerified = u.EmailVerified ? "Yes" : "No",
                IsActive = u.IsActive ? "Yes" : "No",
                u.CreatedAt,
                LastLogin = u.LastLoginAt
            }).ToListAsync();

        var csv = GenerateCsv(users);
        return File(System.Text.Encoding.UTF8.GetBytes(csv), "text/csv", $"users_export_{DateTime.UtcNow:yyyyMMdd}.csv");
    }

    [HttpGet("deals")]
    public async Task<IActionResult> ExportDeals([FromQuery] string? status)
    {
        var query = _mainDb.Deals.Include(d => d.Organizer).AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status) && status != "All")
            query = query.Where(d => d.ModerationStatus == status);

        var deals = await query.OrderBy(d => d.CreatedAt)
            .Select(d => new
            {
                d.Id,
                Title = d.Title,
                Category = d.Category,
                Organizer = d.Organizer != null ? d.Organizer.FullName : "",
                OrganizerEmail = d.Organizer != null ? d.Organizer.Email : "",
                d.OriginalPrice,
                d.GroupPrice,
                d.MinMembers,
                d.MaxMembers,
                d.MembersJoined,
                d.Status,
                d.ModerationStatus,
                d.UpvoteCount,
                d.LikeCount,
                d.CreatedAt,
                d.Deadline,
                d.PickupLocation
            }).ToListAsync();

        var csv = GenerateCsv(deals);
        return File(System.Text.Encoding.UTF8.GetBytes(csv), "text/csv", $"deals_export_{DateTime.UtcNow:yyyyMMdd}.csv");
    }

    [HttpGet("orders")]
    public async Task<IActionResult> ExportOrders([FromQuery] string? status)
    {
        var query = _mainDb.Orders.Include(o => o.User).Include(o => o.Deal).AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(o => o.Status == status);

        var orders = await query.OrderBy(o => o.CreatedAt)
            .Select(o => new
            {
                o.Id,
                BuyerName = o.User != null ? o.User.FullName : "",
                BuyerEmail = o.User != null ? o.User.Email : "",
                DealTitle = o.Deal != null ? o.Deal.Title : "",
                o.Quantity,
                o.TotalPrice,
                o.Status,
                o.CreatedAt,
                o.UpdatedAt
            }).ToListAsync();

        var csv = GenerateCsv(orders);
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
        if (value.Contains(',') || value.Contains('\"') || value.Contains('\n'))
            return $"\"{value.Replace("\"", "\"\"")}\"";
        return value;
    }
}
