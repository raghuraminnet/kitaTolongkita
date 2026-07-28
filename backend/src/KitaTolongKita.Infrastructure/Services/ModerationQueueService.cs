using System.Threading.Channels;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Core.Interfaces;
using KitaTolongKita.Infrastructure.Data;

namespace KitaTolongKita.Infrastructure.Services;

/// <summary>
/// Background service that processes the deal moderation queue.
/// Deals are enqueued when posted and processed asynchronously by the AI service.
/// </summary>
public class ModerationQueueService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ModerationQueueService> _logger;
    private readonly Channel<Guid> _queue;

    public ModerationQueueService(
        IServiceScopeFactory scopeFactory,
        ILogger<ModerationQueueService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _queue = Channel.CreateUnbounded<Guid>(new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = false
        });
    }

    /// <summary>Enqueue a deal for AI moderation.</summary>
    public void Enqueue(Guid dealId)
    {
        _queue.Writer.TryWrite(dealId);
        _logger.LogInformation("Deal {DealId} enqueued for moderation", dealId);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Moderation queue service started");

        await foreach (var dealId in _queue.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                await ProcessDealAsync(dealId, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing moderation for deal {DealId}", dealId);
            }
        }
    }

    private async Task ProcessDealAsync(Guid dealId, CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var moderation = scope.ServiceProvider.GetRequiredService<IModerationService>();
        var es = scope.ServiceProvider.GetRequiredService<IElasticsearchService>();
        var push = scope.ServiceProvider.GetService<IPushNotificationService>();

        var deal = await db.Deals.FindAsync(new object[] { dealId }, ct);
        if (deal == null)
        {
            _logger.LogWarning("Deal {DealId} not found for moderation", dealId);
            return;
        }

        _logger.LogInformation("Processing moderation for deal {DealId}: {Title}", dealId, deal.Title);

        // Run AI analysis
        var result = await moderation.AnalyseDealAsync(deal);

        // Update deal with moderation results
        deal.ModerationScore = result.Score;
        deal.ModerationFlags = result.Flags.Select(f => f.ToString()).ToList();
        var previousStatus = deal.ModerationStatus;
        deal.ModerationStatus = result.Decision switch
        {
            ModerationDecision.AutoApproved => ModerationStatus.Approved,
            ModerationDecision.PendingReview => ModerationStatus.UnderReview,
            ModerationDecision.Rejected => ModerationStatus.Rejected,
            _ => ModerationStatus.UnderReview
        };

        if (result.Decision == ModerationDecision.Rejected)
            deal.ModerationRejectReason = result.Summary;

        // Check for duplicates via ES
        var duplicateId = await moderation.FindDuplicateDealIdAsync(deal);
        if (duplicateId.HasValue)
        {
            deal.DuplicateOfDealId = duplicateId.Value.ToString();
            if (!deal.ModerationFlags.Contains("Duplicate"))
                deal.ModerationFlags.Add("Duplicate");
            deal.ModerationStatus = ModerationStatus.UnderReview;
        }

        await db.SaveChangesAsync(ct);

        // Update Elasticsearch index
        try { await es.UpdateDealAsync(deal); }
        catch (Exception ex) { _logger.LogWarning(ex, "Failed to update ES after moderation"); }

        // Send push notification to deal organizer if status changed
        if (push != null && previousStatus != deal.ModerationStatus)
        {
            try
            {
                var title = deal.ModerationStatus switch
                {
                    ModerationStatus.Approved => "🎉 Your deal is live!",
                    ModerationStatus.Rejected => "❌ Your deal was not approved",
                    ModerationStatus.UnderReview => "🔍 Your deal is under review",
                    _ => "Deal Update"
                };
                var body = deal.ModerationStatus switch
                {
                    ModerationStatus.Approved => $"'{deal.Title}' has been approved and is now visible to everyone!",
                    ModerationStatus.Rejected => $"'{deal.Title}' was rejected: {deal.ModerationRejectReason ?? "See details in app."}",
                    ModerationStatus.UnderReview => $"'{deal.Title}' is being reviewed by our team. We'll notify you once it's approved.",
                    _ => $"Update on '{deal.Title}'"
                };
                await push.SendToUserAsync(deal.OrganizerId, title, body, new
                {
                    type = "deal_moderation",
                    dealId = deal.Id.ToString(),
                    status = deal.ModerationStatus.ToString()
                });
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to send moderation push"); }
        }

        _logger.LogInformation(
            "Deal {DealId} moderation complete: Score={Score}, Decision={Decision}",
            dealId, result.Score, deal.ModerationStatus);
    }
}
