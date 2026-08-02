namespace KitaTolongKita.Core.Entities;

/// <summary>
/// A buyer's commitment to a group buy deal. Tracks status, booking ID, and QR code for delivery proof.
/// Replaces the Order concept for contributor group buy deals.
/// </summary>
public class DealLookup
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DealId { get; set; }
    public Guid UserId { get; set; }
    public int Quantity { get; set; } = 1;
    public string Status { get; set; } = "Pending"; // Pending | Secured | InProcess | Delivered | Cancelled
    public string BookingId { get; set; } = string.Empty; // Human readable: "LK-XXXXXXXX"
    public string QrCode { get; set; } = string.Empty; // Base64 encoded QR content
    public bool QrVerified { get; set; }
    public DateTime? QrVerifiedAt { get; set; }
    public Guid? QrVerifiedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Deal Deal { get; set; } = null!;
    public User User { get; set; } = null!;
}
