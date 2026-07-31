using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using KitaTolongKita.Api.Services;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Core.Interfaces;

namespace KitaTolongKita.Infrastructure.Services;

/// <summary>
/// OpenAI (non-Azure) implementation of IModerationService.
/// Uses IAiConfigProvider for hot-reloadable config (env vars + Redis pub/sub from admin).
/// Configure: AI__Provider=openai, AI__ApiKey=sk-..., AI__Model=gpt-4o, AI__BaseUrl=https://api.openai.com/v1
/// </summary>
public class OpenAiModerationService : IModerationService
{
    private readonly HttpClient _http;
    private readonly ILogger<OpenAiModerationService> _logger;
    private readonly IAiConfigProvider _cfg;

    public OpenAiModerationService(HttpClient http, IAiConfigProvider config, ILogger<OpenAiModerationService> logger)
    {
        _http = http;
        _logger = logger;
        _cfg = config;
    }

    public async Task<ModerationResult> AnalyseDealAsync(Deal deal)
    {
        var prompt = BuildPrompt(deal);
        var apiKey = _cfg.ApiKey;
        var baseUrl = _cfg.BaseUrl.TrimEnd('/');
        var model = string.IsNullOrEmpty(_cfg.Model) ? "gpt-4o-mini" : _cfg.Model;

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/chat/completions");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            request.Content = new StringContent(JsonSerializer.Serialize(new
            {
                model,
                messages = new[]
                {
                    new { role = "system", content = SYSTEM_PROMPT },
                    new { role = "user", content = prompt }
                },
                max_tokens = 800,
                temperature = 0.3
            }), Encoding.UTF8, "application/json");

            using var response = await _http.SendAsync(request);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("OpenAI returned {StatusCode}: {Body}", response.StatusCode, responseBody[..Math.Min(200, responseBody.Length)]);
                return MakeFallbackResult(deal.Id, "openai");
            }

            using var doc = JsonDocument.Parse(responseBody);
            var reply = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString() ?? "";

            return ParseResponse(deal.Id, reply, responseBody, "openai");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "OpenAI moderation failed for deal {DealId}", deal.Id);
            return MakeFallbackResult(deal.Id, "openai");
        }
    }

    public Task<Guid?> FindDuplicateDealIdAsync(Deal deal)
        // Duplicate detection delegated to Elasticsearch more_like_this query
        => Task.FromResult<Guid?>(null);

    private static string BuildPrompt(Deal deal) =>
        $@"Analyse this deal posting for community safety. Respond ONLY with valid JSON:
{{ ""score"": 0-100 integer, ""flags"": [""Fraud"",""Scam"",""PriceManipulation"",""WrongInformation"",""Nudity"",""IrrelevantImage"",""IrrelevantContent"",""Duplicate"",""OffensiveContent"",""SuspiciousLink""], ""summary"": ""1-2 sentence"", ""decision"": ""AutoApproved"" if score≥80, ""PendingReview"" if 50-79, ""Rejected"" if <50 }}

Deal: Title={deal.Title}, Description={deal.Description}, Category={deal.Category},
OriginalPrice={deal.OriginalPrice:C}, GroupPrice={deal.GroupPrice:C},
PickupLocation={deal.PickupLocation}, Hashtags={string.Join(",", deal.Hashtags ?? new())}";

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
                DealId = dealId,
                Score = Math.Clamp(score, 0, 100),
                Flags = flags,
                Summary = summary,
                Decision = decision,
                AiProvider = provider,
                RawResponse = raw.Length > 2000 ? raw[..2000] : raw
            };
        }
        catch
        {
            return MakeFallbackResult(dealId, provider);
        }
    }

    private static ModerationResult MakeFallbackResult(Guid dealId, string provider) => new()
    {
        DealId = dealId,
        Score = 60,
        Decision = ModerationDecision.PendingReview,
        Summary = "AI analysis unavailable — manual review required.",
        AiProvider = provider
    };

    private const string SYSTEM_PROMPT = @"You are a strict content moderator for a Malaysian community marketplace. Score 0-100: 80+=AutoApprove, 50-79=PendingReview, <50=Reject. Respond ONLY with JSON.";
}
