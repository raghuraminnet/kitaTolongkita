using System.Net.Http;
using System.Text;
using System.Text.Json;
using KitaTolongKita.Admin.Api.DTOs;

namespace KitaTolongKita.Admin.Api.Services;

public interface IAiTestService
{
    Task<TestAiConnectionResponse> TestConnectionAsync(TestAiConnectionRequest req);
}

public class AiTestService : IAiTestService
{
    private readonly ILogger<AiTestService> _logger;

    public AiTestService(ILogger<AiTestService> logger) => _logger = logger;

    public async Task<TestAiConnectionResponse> TestConnectionAsync(TestAiConnectionRequest req)
    {
        return req.Provider switch
        {
            "azure-openai" => await TestAzureOpenAiAsync(req),
            "openai" => await TestOpenAiAsync(req),
            "anthropic" => await TestAnthropicAsync(req),
            _ => new TestAiConnectionResponse(false, $"Unknown provider: {req.Provider}")
        };
    }

    private async Task<TestAiConnectionResponse> TestAzureOpenAiAsync(TestAiConnectionRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.ApiKey))
            return new TestAiConnectionResponse(false, "API key is required");
        if (string.IsNullOrWhiteSpace(req.Endpoint))
            return new TestAiConnectionResponse(false, "Endpoint is required");
        if (string.IsNullOrWhiteSpace(req.DeploymentName))
            return new TestAiConnectionResponse(false, "Deployment name is required");

        try
        {
            var url = $"{req.Endpoint.TrimEnd('/')}/openai/deployments/{req.DeploymentName}/chat/completions?api-version=2024-02-15-preview";
            using var client = new HttpClient();
            client.DefaultRequestHeaders.Add("api-key", req.ApiKey);
            var body = new
            {
                messages = new[] { new { role = "user", content = "Hi" } },
                max_tokens = 5
            };
            var resp = await client.PostAsync(url, new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json"));
            var content = await resp.Content.ReadAsStringAsync();
            if (resp.IsSuccessStatusCode)
                return new TestAiConnectionResponse(true, "Connection successful! Azure OpenAI is reachable.");
            return new TestAiConnectionResponse(false, $"API error ({resp.StatusCode}): {content[..Math.Min(200, content.Length)]}");
        }
        catch (Exception ex)
        {
            return new TestAiConnectionResponse(false, $"Connection failed: {ex.Message}");
        }
    }

    private async Task<TestAiConnectionResponse> TestOpenAiAsync(TestAiConnectionRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.ApiKey))
            return new TestAiConnectionResponse(false, "API key is required");
        var model = req.ModelName ?? "gpt-4o-mini";
        var baseUrl = req.BaseUrl?.TrimEnd('/') ?? "https://api.openai.com/v1";

        try
        {
            using var client = new HttpClient();
            client.DefaultRequestHeaders.Add("Authorization", $"Bearer {req.ApiKey}");
            var body = new
            {
                model,
                messages = new[] { new { role = "user", content = "Hi" } },
                max_tokens = 5
            };
            var resp = await client.PostAsync($"{baseUrl}/chat/completions",
                new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json"));
            var content = await resp.Content.ReadAsStringAsync();
            if (resp.IsSuccessStatusCode)
                return new TestAiConnectionResponse(true, $"Connection successful! Using model: {model}");
            return new TestAiConnectionResponse(false, $"API error ({resp.StatusCode}): {content[..Math.Min(200, content.Length)]}");
        }
        catch (Exception ex)
        {
            return new TestAiConnectionResponse(false, $"Connection failed: {ex.Message}");
        }
    }

    private async Task<TestAiConnectionResponse> TestAnthropicAsync(TestAiConnectionRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.ApiKey))
            return new TestAiConnectionResponse(false, "API key is required");
        var model = req.ModelName ?? "claude-sonnet-4-20250514";
        var baseUrl = req.BaseUrl?.TrimEnd('/') ?? "https://api.anthropic.com/v1";

        try
        {
            using var client = new HttpClient();
            client.DefaultRequestHeaders.Add("x-api-key", req.ApiKey);
            client.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");
            var body = new
            {
                model,
                max_tokens = 10,
                messages = new[] { new { role = "user", content = "Hi" } }
            };
            var resp = await client.PostAsync($"{baseUrl}/messages",
                new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json"));
            var content = await resp.Content.ReadAsStringAsync();
            if (resp.IsSuccessStatusCode)
                return new TestAiConnectionResponse(true, $"Connection successful! Using model: {model}");
            return new TestAiConnectionResponse(false, $"API error ({resp.StatusCode}): {content[..Math.Min(200, content.Length)]}");
        }
        catch (Exception ex)
        {
            return new TestAiConnectionResponse(false, $"Connection failed: {ex.Message}");
        }
    }
}
