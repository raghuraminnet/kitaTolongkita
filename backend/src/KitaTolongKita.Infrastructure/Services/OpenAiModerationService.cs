using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Core.Interfaces;

namespace KitaTolongKita.Infrastructure.Services;

/// <summary>
/// OpenAI (non-Azure) implementation of IModerationService.
/// Configure: AI__Provider=openai, AI__ApiKey=sk-..., AI__Model=gpt-4o
/// </summary>
public class OpenAiModerationService : IModerationService
{
    private readonly HttpClient _http;
    private readonly ILogger<OpenAiModerationService> _logger;
    private readonly string _apiKey;
    private readonly string _model;
    private const string BaseUrl = "https://api.openai.com/v1";

    public OpenAiModerationService(HttpClient http, IConfiguration config, ILogger<OpenAiModerationService> logger)
    {
        _http = http;
        _logger = logger;
        _apiKey = config["AI:ApiKey"] ?? "";
        _model = config["AI:Model"] ?? "gpt-4o";

        if (!string.IsNullOrEmpty(_apiKey))
            _http.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", _apiKey);
    }

    public async Task<ModerationResult> AnalyseDealAsync(Deal deal)
    {
        var prompt = BuildPrompt(deal);

        try
        {
            var requestBody = new
            {
                model = _model,
                messages = new[]
                {
                    new { role = "system", content = SYSTEM_PROMPT },
                    new { role = "user", content = prompt }
                },
                max_tokens = 800,
                temperature = 0.3
            };

            var json = JsonSerializer.Serialize(requestBody);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            using var response = await _http.PostAsync($"{BaseUrl}/chat/completions", content);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("OpenAI returned {StatusCode}", response.StatusCode);
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
    {
        // Duplicate detection delegated to Elasticsearch more_like_this query
        return Task.FromResult<Guid?>(null);
    }

    private string BuildPrompt(Deal deal) =>
        $@"Analyse this deal posting for community safety. Respond ONLY with valid JSON:
{{ ""score"": 0-100 integer, ""flags"": [""Fraud"",""Scam"",""PriceManipulation"",""WrongInformation"",""Nudity"",""IrrelevantImage"",""IrrelevantContent"",""Duplicate"",""OffensiveContent"",""SuspiciousLink""], ""summary"": ""1-2 sentence"", ""decision"": ""AutoApproved"" if score≥80, ""PendingReview"" if 50-79, ""Rejected"" if <50 }}

Deal: Title={deal.Title}, Description={deal.Description}, Category={deal.Category},
OriginalPrice={deal.OriginalPrice:C}, GroupPrice={deal.GroupPrice:C},
PickupLocation={deal.PickupLocation}, Hashtags={string.Join(",", deal.Hashtags ?? new())}";

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
            var score = root.GetProperty("score").GetInt32();
            var summary = root.GetProperty("summary").GetString() ?? "";
            var flags = new List<ModerationFlag>();
            if (root.TryGetProperty("flags", out var f))
                foreach (var flag in f.EnumerateArray())
                    if (Enum.TryParse<ModerationFlag>(flag.GetString() ?? "", true, out var parsed))
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
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Parse error in OpenAI moderation");
            return MakeFallbackResult(dealId, provider);
        }
    }

    private ModerationResult MakeFallbackResult(Guid dealId, string provider) =>
        new()
        {
            DealId = dealId,
            Score = 60,
            Decision = ModerationDecision.PendingReview,
            Summary = "AI analysis unavailable — manual review required.",
            AiProvider = provider
        };

    private const string SYSTEM_PROMPT = @"You are a strict content moderator for a Malaysian community marketplace. Score 0-100: 80+=AutoApprove, 50-79=PendingReview, <50=Reject. Respond ONLY with JSON.";
}
