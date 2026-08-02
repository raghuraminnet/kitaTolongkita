using System.Threading.Channels;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace KitaTolongKita.Infrastructure.Services;

/// <summary>
/// Background worker that processes push notifications asynchronously.
/// Prevents deal creation / other writes from being blocked by slow FCM calls.
/// </summary>
public class NotificationQueueService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<NotificationQueueService> _logger;
    private readonly Channel<NotificationJob> _queue;

    public NotificationQueueService(IServiceScopeFactory scopeFactory, ILogger<NotificationQueueService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _queue = Channel.CreateUnbounded<NotificationJob>(new UnboundedChannelOptions { SingleReader = true });
    }

    public void Enqueue(NotificationJob job) => _queue.Writer.TryWrite(job);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("NotificationQueueService started");
        await foreach (var job in _queue.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var push = scope.ServiceProvider.GetRequiredService<IPushNotificationService>();
                await push.SendAndStoreAsync(job.UserId, job.Type, job.Title, job.Body, job.Data);
                _logger.LogDebug("Queued notification sent to user {UserId}: {Title}", job.UserId, job.Title);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send queued notification to user {UserId}", job.UserId);
            }
        }
    }
}

public record NotificationJob(Guid UserId, string Type, string Title, string Body, object? Data = null);
