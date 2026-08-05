namespace KitaTolongKita.Core.Entities;

/// <summary>
/// Multiple AI provider configurations — one active at a time.
/// Used by the moderation pipeline to call the configured AI provider.
/// </summary>
public class AiConfig
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Provider { get; set; } = string.Empty; // azure-openai | openai | anthropic
    public string? ApiKey { get; set; }
    public string? Endpoint { get; set; }     // Azure OpenAI endpoint URL
    public string? BaseUrl { get; set; }      // OpenAI/Anthropic compatible base URL
    public string? DeploymentName { get; set; } // Azure OpenAI deployment name
    public string? ModelName { get; set; }     // OpenAI / Anthropic model name
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public int CreatedByAdminId { get; set; }
}
