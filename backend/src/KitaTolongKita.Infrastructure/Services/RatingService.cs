using Microsoft.EntityFrameworkCore;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Infrastructure.Data;

namespace KitaTolongKita.Infrastructure.Services;

public interface IRatingService
{
    Task<ContributorRating?> RateContributorAsync(Guid lookupId, Guid reviewerId, int rating, string? reviewText);
    Task<RatingSummaryDto?> GetContributorRatingSummaryAsync(Guid contributorId);
    Task<List<RatingItemDto>> GetContributorRatingsAsync(Guid contributorId, int page, int pageSize);
}

public record RatingSummaryDto(decimal Average, int Count, int FiveStar, int FourStar, int ThreeStar, int TwoStar, int OneStar);
public record RatingItemDto(
    Guid Id, Guid LookupId, Guid ReviewerId, string ReviewerName, string? ReviewerAvatar,
    string? ReviewText, int Rating, DateTime CreatedAt
);

public class RatingService : IRatingService
{
    private readonly AppDbContext _db;
    private readonly IPushNotificationService _push;
    private readonly ILogger<RatingService> _logger;
    private const int MaxReviewLength = 300;

    public RatingService(AppDbContext db, IPushNotificationService push, ILogger<RatingService> logger)
    {
        _db = db;
        _push = push;
        _logger = logger;
    }

    public async Task<ContributorRating?> RateContributorAsync(Guid lookupId, Guid reviewerId, int rating, string? reviewText)
    {
        if (rating < 1 || rating > 5) return null;

        // Lookup must be delivered
        var lookup = await _db.DealLookups
            .Include(l => l.Deal)
            .FirstOrDefaultAsync(l => l.Id == lookupId && l.UserId == reviewerId);
        if (lookup == null || lookup.Status != "Delivered")
            return null;

        // One rating per lookup
        var existing = await _db.ContributorRatings
            .FirstOrDefaultAsync(r => r.LookupId == lookupId);
        if (existing != null) return null;

        var contributorId = lookup.Deal!.OrganizerId;
        var trimmedReview = reviewText?.Length > MaxReviewLength
            ? reviewText[..MaxReviewLength]
            : reviewText?.Trim();

        var entity = new ContributorRating
        {
            LookupId = lookupId,
            DealId = lookup.DealId,
            ContributorId = contributorId,
            ReviewerId = reviewerId,
            Rating = rating,
            ReviewText = trimmedReview
        };

        _db.ContributorRatings.Add(entity);

        // Update contributor's average rating
        await UpdateContributorRatingAsync(contributorId);

        await _db.SaveChangesAsync();

        _logger.LogInformation("Rating {Rating} submitted for contributor {ContributorId} by {ReviewerId}",
            rating, contributorId, reviewerId);

        return entity;
    }

    public async Task<RatingSummaryDto?> GetContributorRatingSummaryAsync(Guid contributorId)
    {
        var ratings = await _db.ContributorRatings
            .AsNoTracking()
            .Where(r => r.ContributorId == contributorId)
            .ToListAsync();

        if (ratings.Count == 0)
            return new RatingSummaryDto(0, 0, 0, 0, 0, 0, 0);

        var avg = Math.Round((decimal)ratings.Average(r => r.Rating), 2);
        return new RatingSummaryDto(
            avg, ratings.Count,
            ratings.Count(r => r.Rating == 5),
            ratings.Count(r => r.Rating == 4),
            ratings.Count(r => r.Rating == 3),
            ratings.Count(r => r.Rating == 2),
            ratings.Count(r => r.Rating == 1)
        );
    }

    public async Task<List<RatingItemDto>> GetContributorRatingsAsync(Guid contributorId, int page, int pageSize)
    {
        return await _db.ContributorRatings
            .AsNoTracking()
            .Where(r => r.ContributorId == contributorId)
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Join(_db.Users, r => r.ReviewerId, u => u.Id, (r, u) =>
                new RatingItemDto(r.Id, r.LookupId, r.ReviewerId,
                    u.FullName, u.AvatarUrl, r.ReviewText, r.Rating, r.CreatedAt))
            .ToListAsync();
    }

    private async Task UpdateContributorRatingAsync(Guid contributorId)
    {
        var avg = await _db.ContributorRatings
            .Where(r => r.ContributorId == contributorId)
            .AverageAsync(r => (decimal)r.Rating);

        var user = await _db.Users.FindAsync(contributorId);
        if (user != null)
        {
            user.ContributorRating = Math.Round(avg, 2);
        }
    }
}
