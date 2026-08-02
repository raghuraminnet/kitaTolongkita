using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Nest;
using KitaTolongKita.Core.DTOs;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Infrastructure.Data;

namespace KitaTolongKita.Infrastructure.Services;

public interface IElasticsearchService
{
    Task IndexDealAsync(Deal deal);
    Task UpdateDealAsync(Deal deal);
    Task RefreshDealIndexAsync(Guid dealId);
    Task DeleteDealAsync(Guid dealId);
    Task<(List<DealDto> Items, int TotalCount)> SearchDealsAsync(DealSearchRequest request);
    Task<List<DealDto>> SuggestNearbyAsync(double lat, double lon, double radiusKm, string? category, int limit = 5);
    Task<bool> HasDuplicateAsync(Guid dealId, string title, string description);
    Task EnsureIndexExistsAsync();
}

public class ElasticsearchService : IElasticsearchService
{
    private readonly IElasticClient _client;
    private readonly ILogger<ElasticsearchService> _logger;
    private readonly IServiceScopeFactory _scopeFactory;
    private const string IndexName = "deals";

    public ElasticsearchService(
        IElasticClient client,
        ILogger<ElasticsearchService> logger,
        IServiceScopeFactory scopeFactory)
    {
        _client = client;
        _logger = logger;
        _scopeFactory = scopeFactory;
    }

    public async Task EnsureIndexExistsAsync()
    {
        var existsResponse = await _client.Indices.ExistsAsync(IndexName);
        if (existsResponse.Exists) return;

        var createResponse = await _client.Indices.CreateAsync(IndexName, c => c
            .Settings(s => s
                .NumberOfShards(1)
                .NumberOfReplicas(0)
                .Analysis(a => a
                    .Analyzers(an => an
                        .Custom("hashtag_analyzer", ca => ca
                            .Tokenizer("keyword")
                            .Filters("lowercase")
                        )
                    )
                )
            )
            .Map<EsDeal>(m => m
                .Properties(p => p
                    .Keyword(k => k.Name(n => n.Id))
                    .Text(t => t.Name(n => n.Title).Analyzer("standard").Boost(3))
                    .Text(t => t.Name(n => n.Description).Analyzer("standard"))
                    .Keyword(k => k.Name(n => n.Category))
                    .Number(n => n.Name(n => n.OriginalPrice).Type(NumberType.Double))
                    .Number(n => n.Name(n => n.GroupPrice).Type(NumberType.Double))
                    .Number(n => n.Name(n => n.MembersJoined).Type(NumberType.Integer))
                    .Date(d => d.Name(n => n.Deadline))
                    .Date(d => d.Name(n => n.CreatedAt))
                    .Keyword(k => k.Name(n => n.Status))
                    .Text(t => t.Name(n => n.PickupLocation))
                    .GeoPoint(g => g.Name(n => n.Location))
                    // Hashtags use a custom analyzer → must be Text (not Keyword),
                    // because NEST's KeywordPropertyDescriptor has no Analyzer().
                    .Text(t => t.Name(n => n.Hashtags).Analyzer("hashtag_analyzer"))
                    .Keyword(k => k.Name(n => n.OrganizerId))
                    .Number(n => n.Name(n => n.UpvoteCount).Type(NumberType.Integer))
                    .Number(n => n.Name(n => n.LikeCount).Type(NumberType.Integer))
                    .Keyword(k => k.Name(n => n.ModerationStatus))
                    .Text(t => t.Name(n => n.OrganizerName).Analyzer("standard").Boost(0.5))
                    .Boolean(b => b.Name(n => n.IsActive))
                )
            )
        );

        if (!createResponse.IsValid)
            _logger.LogError("Failed to create ES index: {Error}", createResponse.DebugInformation);
    }

    public async Task IndexDealAsync(Deal deal)
    {
        var doc = ToEsDeal(deal);
        var response = await _client.IndexAsync(doc, i => i.Index(IndexName).Id(deal.Id.ToString()));
        if (!response.IsValid)
            _logger.LogError("Failed to index deal {DealId}: {Error}", deal.Id, response.DebugInformation);
    }

    public async Task UpdateDealAsync(Deal deal)
    {
        // Upsert via Index — the existing doc is replaced entirely with the latest deal data
        await IndexDealAsync(deal);
    }

    /// <summary>Force-reload a deal from DB with its Organizer populated, then re-index to ES.</summary>
    public async Task RefreshDealIndexAsync(Guid dealId)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var deal = await db.Deals
            .Include(d => d.Organizer)
            .FirstOrDefaultAsync(d => d.Id == dealId);
        if (deal == null)
        {
            _logger.LogWarning("RefreshDealIndexAsync: deal {DealId} not found", dealId);
            return;
        }
        await IndexDealAsync(deal);
        _logger.LogInformation("RefreshDealIndexAsync: re-indexed deal {DealId} with organizer {OrganizerName}",
            dealId, deal.Organizer?.FullName ?? "(none)");
    }

    public async Task DeleteDealAsync(Guid dealId)
    {
        var response = await _client.DeleteAsync<EsDeal>(dealId.ToString(), d => d.Index(IndexName));
        if (!response.IsValid)
            _logger.LogWarning("Failed to delete deal {DealId} from ES: {Error}", dealId, response.DebugInformation);
    }

    public async Task<(List<DealDto> Items, int TotalCount)> SearchDealsAsync(DealSearchRequest request)
    {
        var mustQueries = new List<Func<QueryContainerDescriptor<EsDeal>, QueryContainer>>();

        // Only active approved deals
        mustQueries.Add(q => q.Term(t => t.Field(f => f.Status).Value("Active")));
        mustQueries.Add(q => q.Term(t => t.Field(f => f.IsActive).Value(true)));
        mustQueries.Add(q => q.Term(t => t.Field(f => f.ModerationStatus).Value("Approved")));

        // Text search
        if (!string.IsNullOrWhiteSpace(request.Query))
        {
            mustQueries.Add(q => q.MultiMatch(mm => mm
                .Fields(f => f
                    .Field(ff => ff.Title, boost: 3)
                    .Field(ff => ff.Description)
                    .Field(ff => ff.Hashtags, boost: 2)
                )
                .Query(request.Query)
                .Type(TextQueryType.BestFields)
                .Fuzziness(Fuzziness.Auto)
            ));
        }

        // Category filter
        if (!string.IsNullOrWhiteSpace(request.Category) && request.Category != "All")
            mustQueries.Add(q => q.Term(t => t.Field(f => f.Category).Value(request.Category)));

        // Price range
        if (request.MinPrice.HasValue)
            mustQueries.Add(q => q.Range(r => r.Field(f => f.GroupPrice).GreaterThanOrEquals((double)request.MinPrice.Value)));
        if (request.MaxPrice.HasValue)
            mustQueries.Add(q => q.Range(r => r.Field(f => f.GroupPrice).LessThanOrEquals((double)request.MaxPrice.Value)));

        // Geo filter — only include deals within radius that have location
        if (request.Latitude.HasValue && request.Longitude.HasValue && request.RadiusKm.HasValue)
        {
            mustQueries.Add(q => q.GeoDistance(g => g
                .Field(f => f.Location)
                .Distance(request.RadiusKm.Value, DistanceUnit.Kilometers)
                .Location(new GeoLocation(request.Latitude.Value, request.Longitude.Value))
            ));
        }


        // Build sort inline — apply geo-distance first if location is available,
        // then apply the requested sort order
        var searchResponse = await _client.SearchAsync<EsDeal>(s =>
        {
            s.Index(IndexName)
             .Query(q => q.Bool(b => b.Must(mustQueries)))
             .From((request.Page - 1) * request.PageSize)
             .Size(request.PageSize)
             .ScriptFields(sf => sf
                 .ScriptField("distance", sc => sc
                     .Source("doc['location'].arcDistance(params.lat, params.lon) / 1000")
                     .Params(p => p
                         .Add("lat", request.Latitude ?? 0)
                         .Add("lon", request.Longitude ?? 0)
                     )
                 )
             );

            // Always apply geo-distance sort first if location is provided
            if (request.Latitude.HasValue && request.Longitude.HasValue)
            {
                s = s.Sort(so => so
                    .GeoDistance(g => g
                        .Field(f => f.Location)
                        .Points(new GeoLocation(request.Latitude.Value, request.Longitude.Value))
                        .Order(SortOrder.Ascending)
                        .Unit(DistanceUnit.Kilometers)
                    )
                );
            }

            var sortBy = request.SortBy?.ToLowerInvariant() ?? "newest";
            switch (sortBy)
            {
                case "price_asc":
                    s = s.Sort(so => so.Field(fld => fld.GroupPrice, SortOrder.Ascending));
                    break;
                case "price_desc":
                    s = s.Sort(so => so.Field(fld => fld.GroupPrice, SortOrder.Descending));
                    break;
                case "newest":
                    s = s.Sort(so => so.Field(fld => fld.CreatedAt, SortOrder.Descending));
                    break;
                case "popular":
                    s = s.Sort(so => so.Field(fld => fld.MembersJoined, SortOrder.Descending));
                    break;
            }

            return s;
        });
        var items = searchResponse.Hits.Select(h =>
        {
            var doc = h.Source;
            double? distKm = null;
            if (request.Latitude.HasValue && request.Longitude.HasValue && doc.Location != null)
            {
                // doc.Location is non-null here (checked above) and its
                // Latitude/Longitude are non-nullable doubles — no `?? 0`.
                distKm = Math.Round(HaversineDistance(
                    request.Latitude.Value, request.Longitude.Value,
                    doc.Location.Latitude, doc.Location.Longitude), 1);
            }
            return ToDealDto(doc, distKm);
        }).ToList();

        return (items, (int)searchResponse.Total);
    }

    public async Task<List<DealDto>> SuggestNearbyAsync(double lat, double lon, double radiusKm, string? category, int limit = 5)
    {
        var queries = new List<Func<QueryContainerDescriptor<EsDeal>, QueryContainer>>
        {
            q => q.Term(t => t.Field(f => f.Status).Value("Active")),
            q => q.Term(t => t.Field(f => f.IsActive).Value(true)),
            q => q.Term(t => t.Field(f => f.ModerationStatus).Value("Approved")),
            q => q.GeoDistance(g => g
                .Field(f => f.Location)
                .Distance(radiusKm, DistanceUnit.Kilometers)
                .Location(new GeoLocation(lat, lon))
            )
        };

        if (!string.IsNullOrWhiteSpace(category))
            queries.Add(q => q.Term(t => t.Field(f => f.Category).Value(category)));

        var response = await _client.SearchAsync<EsDeal>(s => s
            .Index(IndexName)
            .Query(q => q.Bool(b => b.Must(queries)))
            .Size(limit)
            .Sort(so => so
                .GeoDistance(g => g
                    .Field(f => f.Location)
                    .Points(new GeoLocation(lat, lon))
                    .Order(SortOrder.Ascending)
                    .Unit(DistanceUnit.Kilometers)
                )
            )
        );

        if (!response.IsValid) return new List<DealDto>();

        return response.Hits.Select(h =>
        {
            var doc = h.Source;
            var distKm = doc.Location != null
                ? Math.Round(HaversineDistance(lat, lon, doc.Location.Latitude, doc.Location.Longitude), 1)
                : (double?)null;
            return ToDealDto(doc, distKm);
        }).ToList();
    }

    public async Task<bool> HasDuplicateAsync(Guid dealId, string title, string description)
    {
        // Uses more_like_this to find similar active deals
        var response = await _client.SearchAsync<EsDeal>(s => s
            .Index(IndexName)
            .Query(q => q
                .Bool(b => b
                    .Must(
                        m => m.MoreLikeThis(mlt => mlt
                            .Fields(f => f.Field(ff => ff.Title).Field(ff => ff.Description))
                            .Like(l => l.Text($"{title} {description}"))
                            .MinTermFrequency(1)
                            .MinDocumentFrequency(1)
                            .MaxQueryTerms(25)
                        ),
                        m => m.Term(t => t.Field(f => f.Status).Value("Active")),
                        m => m.Term(t => t.Field(f => f.ModerationStatus).Value("Approved")),
                        m => m.Term(t => t.Field(f => f.Id).Value(dealId.ToString()).Boost(0)) // exclude self
                    )
                )
            )
            .Size(1)
        );

        return response.IsValid && response.Total > 0;
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private static EsDeal ToEsDeal(Deal deal) => new()
    {
        Id = deal.Id.ToString(),
        Title = deal.Title,
        Description = deal.Description,
        Category = deal.Category,
        OriginalPrice = (double)deal.OriginalPrice,
        GroupPrice = (double)deal.GroupPrice,
        MinMembers = deal.MinMembers,
        MaxMembers = deal.MaxMembers,
        MembersJoined = deal.MembersJoined,
        Deadline = deal.Deadline,
        PickupLocation = deal.PickupLocation,
        ImageUrls = deal.ImageUrls,
        Status = deal.Status.ToString(),
        OrganizerId = deal.OrganizerId.ToString(),
        OrganizerName = deal.Organizer?.FullName ?? "",
        CreatedAt = deal.CreatedAt,
        Location = deal.Latitude.HasValue && deal.Longitude.HasValue
            ? new GeoLocation(deal.Latitude.Value, deal.Longitude.Value)
            : null,
        LocationName = deal.LocationName,
        Hashtags = deal.Hashtags,
        UpvoteCount = deal.UpvoteCount,
        LikeCount = deal.LikeCount,
        ModerationStatus = deal.ModerationStatus.ToString(),
        IsActive = deal.Status == DealStatus.Active
    };

    private static DealDto ToDealDto(EsDeal doc, double? distanceKm = null) => new(
        Guid.TryParse(doc.Id ?? "", out var id) ? id : Guid.Empty,
        doc.Title ?? "",
        doc.Description ?? "",
        doc.Category ?? "",
        (decimal)(doc.OriginalPrice),
        (decimal)(doc.GroupPrice),
        doc.MinMembers,
        doc.MaxMembers,
        doc.MembersJoined,
        doc.Deadline,
        doc.PickupLocation ?? "",
        doc.ImageUrls ?? new List<string>(),
        Enum.TryParse<DealStatus>(doc.Status ?? "Draft", out var s) ? s : DealStatus.Draft,
        doc.OrganizerName ?? "",   // ✅ populated from ES index
        null, // OrganizerAvatar — not stored in ES
        doc.CreatedAt,
        doc.Location?.Latitude,
        doc.Location?.Longitude,
        doc.LocationName,
        doc.Hashtags ?? new List<string>(),
        doc.UpvoteCount,
        doc.LikeCount,
        Enum.TryParse<ModerationStatus>(doc.ModerationStatus ?? "Pending", out var ms) ? ms : ModerationStatus.Pending,
        null,
        distanceKm,
        Guid.TryParse(doc.OrganizerId ?? "", out var orgId) ? orgId : null  // ✅ populated from ES index
    );

    /// <summary>Calculate distance between two lat/lon points in km using Haversine formula.</summary>
    private static double HaversineDistance(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371; // Earth radius in km
        var dLat = ToRad(lat2 - lat1);
        var dLon = ToRad(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return R * c;
    }

    private static double ToRad(double deg) => deg * Math.PI / 180;
}

// Elasticsearch document model
internal class EsDeal
{
    public string? Id { get; set; }
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string Category { get; set; } = "";
    public double OriginalPrice { get; set; }
    public double GroupPrice { get; set; }
    public int MinMembers { get; set; }
    public int MaxMembers { get; set; }
    public int MembersJoined { get; set; }
    public DateTime Deadline { get; set; }
    public string PickupLocation { get; set; } = "";
    public List<string> ImageUrls { get; set; } = new();
    public string Status { get; set; } = "Draft";
    public string OrganizerId { get; set; } = "";
    public string OrganizerName { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public GeoLocation? Location { get; set; }
    public string? LocationName { get; set; }
    public List<string> Hashtags { get; set; } = new();
    public int UpvoteCount { get; set; }
    public int LikeCount { get; set; }
    public string ModerationStatus { get; set; } = "Pending";
    public bool IsActive { get; set; }
}
