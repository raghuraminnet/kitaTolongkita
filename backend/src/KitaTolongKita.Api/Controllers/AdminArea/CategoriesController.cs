using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Infrastructure.Data;

namespace KitaTolongKita.Api.Controllers.AdminArea;

[ApiController]
[Route("api/categories")]
[Authorize(AuthenticationSchemes = "AdminJwt", Policy = "Moderator")]
public class CategoriesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<CategoriesController> _logger;

    public CategoriesController(AppDbContext db, ILogger<CategoriesController> logger)
    {
        _db = db;
        _logger = logger;
    }

    private int GetAdminId() =>
        int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    private async Task LogActionAsync(string action, string entityType, string entityId, string? details = null)
    {
        var adminId = GetAdminId();
        var admin = await _db.AdminUsers.FindAsync(adminId);
        _db.AuditLogs.Add(new AuditLog
        {
            AdminUserId = adminId, AdminEmail = admin?.Email ?? "unknown",
            Action = action, EntityType = entityType, EntityId = entityId,
            Details = details, CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
    }

    private async Task<int> GetDealCountForCategoryAsync(string category)
    {
        return await _db.Deals.CountAsync(d => d.Category == category && d.Status == DealStatus.Active);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var cats = await _db.Categories.AsNoTracking().OrderBy(c => c.Name).ToListAsync();
        var items = new List<CategoryItem>();
        foreach (var c in cats)
            items.Add(new CategoryItem(c.Id, c.Name, c.Description, 0, c.IsActive, c.CreatedAt));
        return Ok(new AdminApiResponse(true, null, items));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCategoryRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new AdminApiResponse(false, "Category name is required."));

        var existing = await _db.Categories.AnyAsync(c => c.Name == req.Name);
        if (existing)
            return Conflict(new AdminApiResponse(false, "Category already exists."));

        var adminId = GetAdminId();
        var cat = new Category
        {
            Name = req.Name,
            Description = req.Description,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _db.Categories.Add(cat);
        await _db.SaveChangesAsync();

        await LogActionAsync("CREATED_CATEGORY", "Category", cat.Id.ToString(),
            $"Created category: {cat.Name}");

        return Ok(new AdminApiResponse(true, "Category created.",
            new CategoryItem(cat.Id, cat.Name, cat.Description, 0, cat.IsActive, cat.CreatedAt)));
    }

    [HttpPatch("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCategoryRequest req)
    {
        var cat = await _db.Categories.FindAsync(id);
        if (cat == null) return NotFound(new AdminApiResponse(false, "Category not found."));

        if (req.Name != null) cat.Name = req.Name;
        if (req.Description != null) cat.Description = req.Description;
        if (req.IsActive.HasValue) cat.IsActive = req.IsActive.Value;
        await _db.SaveChangesAsync();

        await LogActionAsync("UPDATED_CATEGORY", "Category", id.ToString(),
            $"Updated category: {cat.Name}");

        return Ok(new AdminApiResponse(true, "Category updated.",
            new CategoryItem(cat.Id, cat.Name, cat.Description, 0, cat.IsActive, cat.CreatedAt)));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var cat = await _db.Categories.FindAsync(id);
        if (cat == null) return NotFound(new AdminApiResponse(false, "Category not found."));

        _db.Categories.Remove(cat);
        await _db.SaveChangesAsync();

        await LogActionAsync("DELETED_CATEGORY", "Category", id.ToString(),
            $"Deleted category: {cat.Name}");

        return Ok(new AdminApiResponse(true, "Category deleted."));
    }
}
