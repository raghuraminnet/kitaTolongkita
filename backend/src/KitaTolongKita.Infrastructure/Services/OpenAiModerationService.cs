using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Core.Interfaces;

namespace KitaTolongKita.Infrastructure.Services;

/// <summary>
/// OpenAI implementation of IModerationService.
/// Supports multi-modal image safety checks, Malaysian fraud detection, and hot-reloadable thresholds.
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
        var apiKey = _cfg.ApiKey;
        var baseUrl = _cfg.BaseUrl?.TrimEnd('/') ?? "https://api.openai.com/v1";
        if (string.IsNullOrWhiteSpace(baseUrl)) baseUrl = "https://api.openai.com/v1";
        var model = string.IsNullOrEmpty(_cfg.Model) ? "gpt-4o-mini" : _cfg.Model;

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _logger.LogWarning("OpenAI API key not configured — routing deal {DealId} to manual review", deal.Id);
            return MakeFallbackResult(deal.Id, "openai");
        }

        try
        {
            var prompt = BuildPrompt(deal);
            var userContent = new List<object>
            {
                new { type = "text", text = prompt }
            };

            // Inspect deal images with Vision LLM (up to 3 images)
            var images = new List<string>();
            if (!string.IsNullOrWhiteSpace(deal.ImageUrl)) images.Add(deal.ImageUrl);
            if (deal.ImageUrls != null) images.AddRange(deal.ImageUrls.Where(u => !string.IsNullOrWhiteSpace(u)));

            foreach (var img in images.Distinct().Take(3))
            {
                if (img.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || img.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                {
                    userContent.Add(new { type = "image_url", image_url = new { url = img } });
                }
            }

            var messages = new object[]
            {
                new { role = "system", content = SYSTEM_PROMPT },
                new { role = "user", content = userContent.ToArray() }
            };

            using var request = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/chat/completions");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            request.Content = new StringContent(JsonSerializer.Serialize(new
            {
                model,
                messages,
                max_tokens = 800,
                temperature = 0.2
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
        => Task.FromResult<Guid?>(null);

    private string BuildPrompt(Deal deal) =>
        $@"Analyse this Malaysian community group-buying deal posting for consumer safety, genuine pricing, and fraud prevention.

Deal Details:
- Title: {deal.Title}
- Description: {deal.Description}
- Category: {deal.Category} (DealCategory: {deal.DealCategory})
- Original Price: RM {deal.OriginalPrice:F2}
- Group Buy Price: RM {deal.GroupPrice:F2}
- Pickup / Distribution Location: {deal.PickupLocation}
- Hashtags: {string.Join(", ", deal.Hashtags ?? new())}
- Configured Auto-Approve Threshold: {_cfg.AutoApproveThreshold}
- Configured Pending-Review Threshold: {_cfg.PendingReviewThreshold}

Score 0-100 and classify into AutoApproved, PendingReview, or Rejected based on the guidelines.";

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

            var autoThreshold = _cfg.AutoApproveThreshold;
            var pendingThreshold = _cfg.PendingReviewThreshold;

            var decision = score >= autoThreshold && !flags.Contains(ModerationFlag.Fraud) && !flags.Contains(ModerationFlag.Scam)
                ? ModerationDecision.AutoApproved
                : score >= pendingThreshold
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
            _logger.LogWarning(ex, "Failed to parse OpenAI moderation reply");
            return MakeFallbackResult(dealId, provider);
        }
    }

    private static ModerationResult MakeFallbackResult(Guid dealId, string provider) => new()
    {
        DealId = dealId,
        Score = 60,
        Decision = ModerationDecision.PendingReview,
        Summary = "AI analysis unavailable — routed to manual review queue.",
        AiProvider = provider
    };

    private const string SYSTEM_PROMPT = @"You are an expert AI content moderator for KitaTolongKita (Gotong Royong deals & group-buying marketplace in Malaysia).
Your duty is ensuring community trust, zero fraud, consumer safety, and Malaysian regulatory compliance.

Malaysian Specific Guardrails:
1. SCAMS & FRAUD: Strictly flag 'Skim Cepat Kaya' (get-rich-quick), unlicensed investment/forex/crypto schemes, illegal money lending (Ah Long), lottery/4D syndicates, Macau scam, fake parcel delivery, pyramid schemes.
2. PRICE MANIPULATION & GOUGING: Flag unrealistic price markups ('harga cekik darah'), deceptive original prices intended to fake massive discounts, or bait-and-switch deals.
3. PROHIBITED ITEMS: Strictly reject illicit drugs, vapes/e-cigarettes, tobacco, unregistered pharmaceuticals, weapons, counterfeit branded luxury goods, and pornographic content.
4. LANGUAGE & ABUSIVE WORDS: Detect hate speech, racism, and vulgarities across Bahasa Melayu, English, Manglish, Tamil, and Chinese dialects (e.g. tipu, scam, pukimak, pantek, babi, sial, etc.).
5. MULTI-MODAL VISION CHECK: If images are provided, verify they depict the actual legitimate goods/services and not fake receipts, stolen internet memes, phishing QR codes, or inappropriate graphics.

Score 0-100:
- 80-100: Safe, genuine, authentic community deal -> AutoApproved
- 50-79: Ambiguous, minor concerns, or requires manual human verification -> PendingReview
- 0-49: Scam, fraud, prohibited items, abusive, severe price manipulation -> Rejected

Respond ONLY with valid JSON in this exact structure:
{
  ""score"": 0-100,
  ""flags"": [""Fraud"",""Scam"",""PriceManipulation"",""WrongInformation"",""Nudity"",""IrrelevantImage"",""IrrelevantContent"",""Duplicate"",""OffensiveContent"",""SuspiciousLink""],
  ""summary"": ""Clear explanation of score and flags in 1-2 sentences"",
  ""decision"": ""AutoApproved"" | ""PendingReview"" | ""Rejected""
}";
}
