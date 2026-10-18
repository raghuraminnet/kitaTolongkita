using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Core.Interfaces;

namespace KitaTolongKita.Infrastructure.Services;

/// <summary>
/// Anthropic Claude implementation of IModerationService.
/// Uses IAiConfigProvider for dynamic hot-reloadable thresholds and Malaysian safety rules.
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
        var apiKey = _cfg.ApiKey;
        var baseUrl = _cfg.BaseUrl?.TrimEnd('/') ?? "https://api.anthropic.com/v1";
        if (string.IsNullOrWhiteSpace(baseUrl)) baseUrl = "https://api.anthropic.com/v1";
        var model = string.IsNullOrEmpty(_cfg.Model) ? "claude-3-5-sonnet-20241022" : _cfg.Model;

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _logger.LogWarning("Anthropic API key not configured — routing deal {DealId} to manual review", deal.Id);
            return MakeFallback(deal.Id, "anthropic");
        }

        var prompt = $@"Analyse this Malaysian community group-buying deal posting for consumer safety, genuine pricing, and fraud prevention.

Deal Details:
- Title: {deal.Title}
- Description: {deal.Description}
- Category: {deal.Category}
- Original Price: RM {deal.OriginalPrice:F2}
- Group Price: RM {deal.GroupPrice:F2}
- Pickup Location: {deal.PickupLocation}
- Hashtags: {string.Join(", ", deal.Hashtags ?? new())}

Score 0-100 (Thresholds: AutoApprove >= {_cfg.AutoApproveThreshold}, PendingReview >= {_cfg.PendingReviewThreshold}). Respond ONLY with valid JSON:
{{
  ""score"": 0-100,
  ""flags"": [""Fraud"",""Scam"",""PriceManipulation"",""WrongInformation"",""Nudity"",""IrrelevantImage"",""IrrelevantContent"",""Duplicate"",""OffensiveContent"",""SuspiciousLink""],
  ""summary"": ""1-2 sentence explanation"",
  ""decision"": ""AutoApproved"" | ""PendingReview"" | ""Rejected""
}}";

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/messages");
            request.Headers.Add("x-api-key", apiKey);
            request.Headers.Add("anthropic-version", "2023-06-01");
            request.Content = new StringContent(JsonSerializer.Serialize(new
            {
                model,
                max_tokens = 600,
                system = "You are an expert AI content moderator for KitaTolongKita (Gotong Royong deals & group-buying marketplace in Malaysia). Protect consumers from Skim Cepat Kaya, loan shark scams, abusive language, and counterfeit products. Respond ONLY in valid JSON.",
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

    private ModerationResult ParseResponse(Guid dealId, string reply, string raw, string provider)
    {
        try
        {
            var jsonStart = reply.IndexOf('{');
            var jsonEnd = reply.LastIndexOf('}');
            if (jsonStart >= 0 && jsonEnd > jsonStart)
                reply = reply.Substring(jsonStart, jsonEnd - jsonStart + 1);

            using var doc = JsonDocument.Parse(reply);
            var root = doc.RootElement;
            var score = root.TryGetProperty("score", out var s) ? s.GetInt32() : 60;
            var summary = root.TryGetProperty("summary", out var summ) ? summ.GetString() ?? "" : "";

            var flags = new List<ModerationFlag>();
            if (root.TryGetProperty("flags", out var f) && f.ValueKind == JsonValueKind.Array)
            {
                foreach (var el in f.EnumerateArray())
                {
                    if (Enum.TryParse<ModerationFlag>(el.GetString() ?? "", true, out var parsed))
                        flags.Add(parsed);
                }
            }

            var decision = score >= _cfg.AutoApproveThreshold && !flags.Contains(ModerationFlag.Fraud) && !flags.Contains(ModerationFlag.Scam)
                ? ModerationDecision.AutoApproved
                : score >= _cfg.PendingReviewThreshold
                    ? ModerationDecision.PendingReview
                    : ModerationDecision.Rejected;

            return new ModerationResult
            {
                DealId = dealId,
                Score = Math.Clamp(score, 0, 100),
                Flags = flags,
                Summary = summary,
                Decision = decision,
                AiProvider = provider,
                RawResponse = raw.Length > 2000 ? raw[..2000] : raw
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse Anthropic moderation reply");
            return MakeFallback(dealId, provider);
        }
    }

    private static ModerationResult MakeFallback(Guid dealId, string provider) => new()
    {
        DealId = dealId,
        Score = 60,
        Decision = ModerationDecision.PendingReview,
        Summary = "AI analysis unavailable — routed to manual review queue.",
        AiProvider = provider
    };
}
