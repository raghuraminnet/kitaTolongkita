using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitaTolongKita.Admin.Api.DTOs;
using KitaTolongKita.Admin.Api.Services;

namespace KitaTolongKita.Admin.Api.Controllers;

[ApiController]
[Route("api/categories")]
[Authorize(Policy = "Moderator")]
public class CategoriesController : ControllerBase
{
    private readonly IAdminService _svc;

    public CategoriesController(IAdminService svc) => _svc = svc;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _svc.GetCategoriesAsync();
        return Ok(new ApiResponse(true, null, result));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCategoryRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new ApiResponse(false, "Category name is required."));
        var adminId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var result = await _svc.CreateCategoryAsync(req, adminId);
        if (result == null) return Conflict(new ApiResponse(false, "Category already exists."));
        return Ok(new ApiResponse(true, "Category created.", result));
    }

    [HttpPatch("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCategoryRequest req)
    {
        var adminId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var result = await _svc.UpdateCategoryAsync(id, req, adminId);
        if (result == null) return NotFound(new ApiResponse(false, "Category not found."));
        return Ok(new ApiResponse(true, "Category updated.", result));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var adminId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var result = await _svc.DeleteCategoryAsync(id, adminId);
        if (!result) return NotFound(new ApiResponse(false, "Category not found."));
        return Ok(new ApiResponse(true, "Category deleted."));
    }
}
