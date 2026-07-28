using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Core.Interfaces;

namespace KitaTolongKita.Infrastructure.Services;

public class AzureOpenAiModerationService : IModerationService
{
    private readonly HttpClient _http;
    private readonly ILogger<AzureOpenAiModerationService> _logger;
    private readonly string _endpoint;
    private readonly string _deployment;
    private readonly string _apiKey;
    private readonly int _autoApproveThreshold = 80;
    private readonly int _pendingReviewThreshold = 50;

    public AzureOpenAiModerationService(
        HttpClient httpClient,
        IConfiguration config,
        ILogger<AzureOpenAiModerationService> logger)
    {
        _http = httpClient;
        _logger = logger;

        _endpoint = config["AI:Endpoint"] ?? config["AI:BaseUrl"] ?? "";
        _deployment = config["AI:DeploymentName"] ?? config["AI:Model"] ?? "gpt-4o";
        _apiKey = config["AI:ApiKey"] ?? "";

        if (!string.IsNullOrEmpty(_apiKey))
            _http.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", _apiKey);

        if (int.TryParse(config["AI:AutoApproveThreshold"], out var t))
            _autoApproveThreshold = t;
        if (int.TryParse(config["AI:PendingReviewThreshold"], out var p))
            _pendingReviewThreshold = p;
    }

    public async Task<ModerationResult> AnalyseDealAsync(Deal deal)
    {
        var prompt = BuildPrompt(deal);

        try
        {
            var requestBody = new
            {
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

            // Construct the Azure OpenAI chat completions URL
            var url = $"{_endpoint.TrimEnd('/')}/openai/deployments/{_deployment}/chat/completions?api-version=2024-02-15-preview";

            using var response = await _http.PostAsync(url, content);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Azure OpenAI returned {StatusCode}: {Body}", response.StatusCode, responseBody);
                // Fail open — put under review rather than blocking
                return new ModerationResult
                {
                    DealId = deal.Id,
                    Score = 60,
                    Decision = ModerationDecision.PendingReview,
                    Summary = "AI analysis unavailable — manual review required.",
                    AiProvider = "azure-openai"
                };
            }

            using var doc = JsonDocument.Parse(responseBody);
            var reply = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString() ?? "";

            return ParseAiResponse(deal.Id, reply, "azure-openai", responseBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Moderation analysis failed for deal {DealId}", deal.Id);
            return new ModerationResult
            {
                DealId = deal.Id,
                Score = 60,
                Decision = ModerationDecision.PendingReview,
                Summary = $"Analysis error: {ex.Message}. Manual review required.",
                AiProvider = "azure-openai"
            };
        }
    }

    public async Task<Guid?> FindDuplicateDealIdAsync(Deal deal)
    {
        try
        {
            var prompt = $@"Two deals are similar if they share the same product/service category, have similar titles, and are within the same location area.
Given this deal:
Title: {deal.Title}
Description: {deal.Description}
Category: {deal.Category}
Location: {deal.PickupLocation}

Search your knowledge for any known duplicate or similar deals. If you find a likely duplicate, respond with just the exact text: DUPLICATE_OF: [brief reason why].
If no duplicate, respond with: NO_DUPLICATE";

            var requestBody = new
            {
                messages = new[]
                {
                    new { role = "system", content = "You are a duplicate detector. Respond only with the exact format requested." },
                    new { role = "user", content = prompt }
                },
                max_tokens = 100,
                temperature = 0
            };

            var json = JsonSerializer.Serialize(requestBody);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            var url = $"{_endpoint.TrimEnd('/')}/openai/deployments/{_deployment}/chat/completions?api-version=2024-02-15-preview";
            using var response = await _http.PostAsync(url, content);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode) return null;

            using var doc = JsonDocument.Parse(body);
            var reply = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString() ?? "";

            if (reply.StartsWith("DUPLICATE_OF:", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogInformation("Duplicate detected for deal {DealId}: {Reason}", deal.Id, reply);
                // We return the deal ID would be resolved via ES more_like_this in production
                return deal.Id; // Placeholder — actual duplicate lookup done via ES
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Duplicate check failed for deal {DealId}", deal.Id);
            return null;
        }
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private string BuildPrompt(Deal deal)
    {
        var imageCount = deal.ImageUrls?.Count ?? 0;
        return $@"Analyse the following deal posting for community safety. Respond ONLY with a valid JSON object matching this exact schema:
{{
  ""score"": integer 0-100,
  ""flags"": [array of strings from: Fraud, Scam, PriceManipulation, WrongInformation, Nudity, IrrelevantImage, IrrelevantContent, Duplicate, OffensiveContent, SuspiciousLink],
  ""summary"": ""brief 1-2 sentence explanation of your decision"",
  ""decision"": ""AutoApproved"" if score ≥ 80, ""PendingReview"" if 50-79, ""Rejected"" if < 50
}}

DEAL TO ANALYSE:
- Title: {deal.Title}
- Description: {deal.Description}
- Category: {deal.Category}
- Original Price: {deal.OriginalPrice:C}
- Group Price: {deal.GroupPrice:C}
- Min Members: {deal.MinMembers}
- Pickup Location: {deal.PickupLocation}
- Hashtags: {string.Join(", ", deal.Hashtags ?? new List<string>())}
- Number of images: {imageCount}

Check for:
1. PRICE MANIPULATION: Is the ""group price"" unrealistic? Compare group price to original price. More than 70% off is suspicious unless clearly justified (bulk buy, clearance).
2. WRONG INFORMATION: Does the description contradict the title or category? Are numbers inconsistent?
3. FRAUD/SCAM: Does it impersonate a known brand? Does it promise impossible deals?
4. NUDITY/INAPPROPRIATE: Are the images appropriate for a community marketplace?
5. IRRELEVANT: Is this actually a deal/group-buy, or just spam/advertising?
6. DUPLICATE: Is this a repost of an existing deal with slightly changed wording?
7. SUSPICIOUS LINKS: Does the description contain external links to unknown sites?";
    }

    private ModerationResult ParseAiResponse(Guid dealId, string reply, string provider, string raw)
    {
        try
        {
            // Try to extract JSON from the reply (AI sometimes wraps in ```json blocks)
            var jsonStart = reply.IndexOf('{');
            var jsonEnd = reply.LastIndexOf('}');
            if (jsonStart >= 0 && jsonEnd > jsonStart)
                reply = reply.Substring(jsonStart, jsonEnd - jsonStart + 1);

            using var doc = JsonDocument.Parse(reply);
            var root = doc.RootElement;

            var score = root.TryGetProperty("score", out var s) ? s.GetInt32() : 60;
            var summary = root.TryGetProperty("summary", out var summ) ? summ.GetString() ?? "" : "";
            var decisionStr = root.TryGetProperty("decision", out var d) ? d.GetString() ?? "PendingReview" : "PendingReview";

            var flags = new List<ModerationFlag>();
            if (root.TryGetProperty("flags", out var f) && f.ValueKind == JsonValueKind.Array)
            {
                foreach (var flag in f.EnumerateArray())
                {
                    var flagStr = flag.GetString() ?? "";
                    if (Enum.TryParse<ModerationFlag>(flagStr, true, out var parsed))
                        flags.Add(parsed);
                }
            }

            // Enforce thresholds
            var decision = score >= _autoApproveThreshold ? ModerationDecision.AutoApproved
                : score >= _pendingReviewThreshold ? ModerationDecision.PendingReview
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
            _logger.LogWarning(ex, "Failed to parse AI moderation response: {Reply}", reply);
            return new ModerationResult
            {
                DealId = dealId,
                Score = 60,
                Decision = ModerationDecision.PendingReview,
                Summary = "Could not parse AI response — manual review required.",
                AiProvider = provider,
                RawResponse = raw.Length > 2000 ? raw[..2000] : raw
            };
        }
    }

    private const string SYSTEM_PROMPT = @"You are a strict content moderation assistant for a Malaysian community group-buying marketplace called KitaTolongKita (Gotong Royong).
Your job is to score deal postings from 0-100 based on community safety:
- Score 80-100: Clean deal, good price transparency, appropriate content → AUTO-APPROVE
- Score 50-79: Minor concerns or incomplete info → PENDING REVIEW
- Score 0-49: Likely scam, fraud, price manipulation, inappropriate content → REJECT

Always respond with ONLY a valid JSON object matching the schema provided. Do not add explanations outside the JSON.";
}
