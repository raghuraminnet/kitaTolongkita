using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Nest;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Infrastructure.Data;

namespace KitaTolongKita.Infrastructure.Services;

/// <summary>
/// Background service that periodically cleans up orphaned Elasticsearch documents
/// that no longer exist in PostgreSQL. Runs every 30 minutes.
/// </summary>
public class ElasticsearchCleanupService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IElasticClient _es;
    private readonly ILogger<ElasticsearchCleanupService> _logger;
    private const string IndexName = "deals";
    private static readonly TimeSpan RunInterval = TimeSpan.FromMinutes(30);

    public ElasticsearchCleanupService(
        IServiceScopeFactory scopeFactory,
        IElasticClient es,
        ILogger<ElasticsearchCleanupService> logger)
    {
        _scopeFactory = scopeFactory;
        _es = es;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Elasticsearch cleanup service started — running every {Interval} min", RunInterval.TotalMinutes);

        // Initial delay to let the app warm up
        await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CleanupOrphanedDocumentsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during ES cleanup run");
            }

            await Task.Delay(RunInterval, stoppingToken);
        }
    }

    /// <summary>
    /// Remove ES documents where the deal no longer exists in PostgreSQL,
    /// and update documents where deal Status or ModerationStatus has changed
    /// (e.g., admin changed status directly in DB without going through the API).
    /// </summary>
    private async Task CleanupOrphanedDocumentsAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // 1. Find all deal IDs in PostgreSQL
        var pgDealIds = await db.Deals
            .AsNoTracking()
            .Select(d => d.Id)
            .ToListAsync(ct);

        var pgDealIdsSet = new HashSet<Guid>(pgDealIds);

        // 2. Scroll through all ES documents
        var scrollTimeout = TimeSpan.FromMinutes(2);
        var searchResponse = await _es.SearchAsync<EsDeal>(s => s
            .Index(IndexName)
            .Scroll(scrollTimeout)
            .Size(500)
            .Query(q => q.MatchAll())
            .Source(src => src.Includes(i => i.Field(f => f.Id))),
            ct);

        if (!searchResponse.IsValid)
        {
            _logger.LogWarning("ES cleanup: scroll failed — {Error}", searchResponse.DebugInformation);
            return;
        }

        var orphanedIds = new List<string>();
        var staleIds = new List<string>();

        // Process initial batch
        ProcessHits(searchResponse.Hits, pgDealIdsSet, orphanedIds, staleIds);

        // Scroll through remaining pages
        var scrollId = searchResponse.ScrollId;
        while (!string.IsNullOrEmpty(scrollId) && searchResponse.Hits.Any())
        {
            searchResponse = await _es.ScrollAsync<EsDeal>(s => s
                .ScrollId(scrollId)
                .Scroll(scrollTimeout)
                .Size(500),
                ct);

            if (!searchResponse.IsValid || !searchResponse.Hits.Any()) break;
            ProcessHits(searchResponse.Hits, pgDealIdsSet, orphanedIds, staleIds);
            scrollId = searchResponse.ScrollId;
        }

        // Clear the scroll context
        if (!string.IsNullOrEmpty(scrollId))
        {
            await _es.ClearScrollAsync(c => c.ScrollId(scrollId), ct);
        }

        // 3. Delete orphaned documents
        if (orphanedIds.Count > 0)
        {
            _logger.LogInformation("ES cleanup: deleting {Count} orphaned documents", orphanedIds.Count);
            foreach (var id in orphanedIds)
            {
                await _es.DeleteAsync<EsDeal>(id, d => d.Index(IndexName), ct);
            }
        }

        // 4. Re-index stale documents (those that exist in PG but ES is out of sync)
        if (staleIds.Count > 0)
        {
            _logger.LogInformation("ES cleanup: re-indexing {Count} stale documents", staleIds.Count);
            foreach (var idStr in staleIds)
            {
                if (!Guid.TryParse(idStr, out var id)) continue;
                var deal = await db.Deals
                    .Include(d => d.Organizer)
                    .AsNoTracking()
                    .FirstOrDefaultAsync(d => d.Id == id, ct);
                if (deal != null)
                {
                    await IndexDealDirectAsync(deal, ct);
                }
            }
        }

        if (orphanedIds.Count > 0 || staleIds.Count > 0)
        {
            _logger.LogInformation("ES cleanup complete: {Orphaned} deleted, {Stale} re-indexed",
                orphanedIds.Count, staleIds.Count);
        }
    }

    private void ProcessHits(
        IEnumerable<IHit<EsDeal>> hits,
        HashSet<Guid> pgDealIds,
        List<string> orphanedIds,
        List<string> staleIds)
    {
        foreach (var hit in hits)
        {
            var docId = hit.Source.Id;
            if (string.IsNullOrEmpty(docId)) continue;

            if (!Guid.TryParse(docId, out var guid))
            {
                orphanedIds.Add(docId); // invalid GUID = garbage
                continue;
            }

            if (!pgDealIds.Contains(guid))
            {
                // Document exists in ES but not in PG — orphaned
                orphanedIds.Add(docId);
            }
            else
            {
                // Check if PG has more recent data than what ES has
                // For simplicity, mark for refresh if status is different
                staleIds.Add(docId);
            }
        }
    }

    private async Task IndexDealDirectAsync(Deal deal, CancellationToken ct)
    {
        var doc = new EsDeal
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

        var response = await _es.IndexAsync(doc, i => i.Index(IndexName).Id(deal.Id.ToString()), ct);
        if (!response.IsValid)
            _logger.LogWarning("ES cleanup: failed to re-index deal {DealId}: {Error}",
                deal.Id, response.DebugInformation);
    }

    // Elasticsearch document model (duplicated here to avoid cross-project reference)
    private class EsDeal
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
}
