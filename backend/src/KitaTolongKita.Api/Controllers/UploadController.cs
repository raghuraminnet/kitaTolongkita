using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace KitaTolongKita.Api.Controllers;

[ApiController]
[Route("api/upload")]
[Authorize]
public class UploadController : ControllerBase
{
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<UploadController> _logger;

    public UploadController(IWebHostEnvironment env, ILogger<UploadController> logger)
    {
        _env = env;
        _logger = logger;
    }

    /// <summary>Upload a deal image. Returns the URL of the uploaded image.</summary>
    [HttpPost("image")]
    [RequestSizeLimit(10 * 1024 * 1024)] // 10MB
    public async Task<IActionResult> UploadImage(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file provided." });

        var allowedTypes = new[] { "image/jpeg", "image/png", "image/webp", "image/gif" };
        if (!allowedTypes.Contains(file.ContentType.ToLower()))
            return BadRequest(new { message = "Only JPEG, PNG, WebP, and GIF images are allowed." });

        if (file.Length > 10 * 1024 * 1024)
            return BadRequest(new { message = "File must be smaller than 10MB." });

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var uploadsDir = Path.Combine(_env.WebRootPath ?? "./wwwroot", "uploads", userId ?? "anonymous");
        Directory.CreateDirectory(uploadsDir);

        var ext = Path.GetExtension(file.FileName).ToLower();
        var fileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(uploadsDir, fileName);

        await using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream);

        var url = $"/uploads/{userId ?? "anonymous"}/{fileName}";
        _logger.LogInformation("Uploaded image: {Url} by user {UserId}", url, userId);

        return Ok(new { url, fileName });
    }
}
