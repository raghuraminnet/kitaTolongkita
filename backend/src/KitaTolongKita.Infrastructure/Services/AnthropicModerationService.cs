using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using KitaTolongKita.Api.Services;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Core.Interfaces;

namespace KitaTolongKita.Infrastructure.Services;

/// <summary>
/// Anthropic Claude implementation of IModerationService.
/// Uses IAiConfigProvider for hot-reloadable config (env vars + Redis pub/sub from admin).
/// Configure: AI__Provider=anthropic, AI__ApiKey=sk-ant-..., AI__Model=claude-3-5-sonnet, AI__BaseUrl=https://api.anthropic.com/v1
/// </summary>
public class AnthropicModerationService : IModerationService
{
    private readonly HttpClient _http;
    private readonly ILogger<AnthropicModerationService> _logger;
    private readonly IAiConfigProvider _cfg;

    public AnthropicModerationService(HttpClient http, IAiConfigProvider config, ILogger<AnthropicModerationService> logger)
    {
        _http = http;
        _logger = logger;
        _cfg = config;
    }

    public async Task<ModerationResult> AnalyseDealAsync(Deal deal)
    {
        var prompt = $@"Analyse this deal posting for community safety. Respond ONLY with valid JSON:
{{ ""score"": 0-100 integer, ""flags"": [""Fraud"",""Scam"",""PriceManipulation"",""WrongInformation"",""Nudity"",""IrrelevantImage"",""IrrelevantContent"",""Duplicate"",""OffensiveContent"",""SuspiciousLink""], ""summary"": ""1-2 sentence"", ""decision"": ""AutoApproved"" if score≥80, ""PendingReview"" if 50-79, ""Rejected"" if <50 }}

Deal: Title={deal.Title}, Description={deal.Description}, Category={deal.Category},
OriginalPrice={deal.OriginalPrice:C}, GroupPrice={deal.GroupPrice:C},
PickupLocation={deal.PickupLocation}, Hashtags={string.Join(",", deal.Hashtags ?? new())}";

        var apiKey = _cfg.ApiKey;
        var baseUrl = _cfg.BaseUrl.TrimEnd('/');
        var model = string.IsNullOrEmpty(_cfg.Model) ? "claude-sonnet-4-20250514" : _cfg.Model;

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/messages");
            request.Headers.Add("x-api-key", apiKey);
            request.Headers.Add("anthropic-version", "2023-06-01");
            request.Content = new StringContent(JsonSerializer.Serialize(new
            {
                model,
                max_tokens = 500,
                messages = new[] { new { role = "user", content = prompt } }
            }), Encoding.UTF8, "application/json");

            using var response = await _http.SendAsync(request);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Anthropic returned {StatusCode}: {Body}", response.StatusCode, responseBody[..Math.Min(200, responseBody.Length)]);
                return MakeFallback(deal.Id, "anthropic");
            }

            using var doc = JsonDocument.Parse(responseBody);
            var reply = doc.RootElement
                .GetProperty("content")[0]
                .GetProperty("text")
                .GetString() ?? "";

            return ParseResponse(deal.Id, reply, responseBody, "anthropic");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Anthropic moderation failed for deal {DealId}", deal.Id);
            return MakeFallback(deal.Id, "anthropic");
        }
    }

    public Task<Guid?> FindDuplicateDealIdAsync(Deal deal) => Task.FromResult<Guid?>(null);

    private static ModerationResult ParseResponse(Guid dealId, string reply, string raw, string provider)
    {
        try
        {
            var jsonStart = reply.IndexOf('{');
            var jsonEnd = reply.LastIndexOf('}');
            if (jsonStart >= 0 && jsonEnd > jsonStart)
                reply = reply.Substring(jsonStart, jsonEnd - jsonStart + 1);

            using var doc = JsonDocument.Parse(reply);
            var root = doc.RootElement;
            var score = root.GetProperty("score").GetInt32();
            var summary = root.GetProperty("summary").GetString() ?? "";

            var flags = new List<ModerationFlag>();
            if (root.TryGetProperty("flags", out var f))
                foreach (var el in f.EnumerateArray())
                    if (Enum.TryParse<ModerationFlag>(el.GetString() ?? "", true, out var parsed))
                        flags.Add(parsed);

            var decision = score >= 80 ? ModerationDecision.AutoApproved
                : score >= 50 ? ModerationDecision.PendingReview
                : ModerationDecision.Rejected;

            return new ModerationResult
            {
                DealId = dealId, Score = Math.Clamp(score, 0, 100),
                Flags = flags, Summary = summary, Decision = decision,
                AiProvider = provider,
                RawResponse = raw.Length > 2000 ? raw[..2000] : raw
            };
        }
        catch
        {
            return MakeFallback(dealId, provider);
        }
    }

    private static ModerationResult MakeFallback(Guid dealId, string provider) => new()
    {
        DealId = dealId, Score = 60, Decision = ModerationDecision.PendingReview,
        Summary = "AI unavailable — manual review required.", AiProvider = provider
    };
}
