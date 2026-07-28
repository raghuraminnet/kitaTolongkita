using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Core.Interfaces;
using KitaTolongKita.Infrastructure.Data;

namespace KitaTolongKita.Infrastructure.Services;

public class OtpService : IOtpService
{
    private readonly AppDbContext _db;
    private readonly int _otpLength = 6;
    private readonly int _otpExpiryMinutes = 10;
    private readonly int _maxAttempts = 3;

    public OtpService(AppDbContext db) => _db = db;

    public async Task<OtpCode> GenerateOtpAsync(string email, string phone, OtpPurpose purpose)
    {
        // Invalidate any existing unused OTPs for this email/purpose
        var existing = await _db.OtpCodes
            .Where(o => o.Email == email && o.Purpose == purpose && !o.Used)
            .ToListAsync();

        foreach (var old in existing)
            old.Used = true;

        var code = RandomNumberGenerator.GetInt32(
            (int)Math.Pow(10, _otpLength - 1),
            (int)Math.Pow(10, _otpLength)
        ).ToString($"D{_otpLength}");

        var otp = new OtpCode
        {
            Email = email,
            Phone = phone,
            Code = code,
            Purpose = purpose,
            ExpiresAt = DateTime.UtcNow.AddMinutes(_otpExpiryMinutes)
        };

        _db.OtpCodes.Add(otp);
        await _db.SaveChangesAsync();

        // TODO: Send via email (Resend/SendGrid) or SMS (Twilio)
        // For now, log to console (replace with actual provider in production)
        Console.WriteLine($"[OTP] To: {email} | Code: {code} | Purpose: {purpose}");

        return otp;
    }

    public async Task<bool> ValidateOtpAsync(string email, string code, OtpPurpose purpose)
    {
        var otp = await _db.OtpCodes
            .Where(o => o.Email == email && o.Code == code && o.Purpose == purpose && !o.Used)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync();

        if (otp == null) return false;
        if (otp.ExpiresAt < DateTime.UtcNow) return false;
        if (otp.Attempts >= _maxAttempts) return false;

        otp.Attempts++;
        await _db.SaveChangesAsync();

        return true;
    }

    public async Task MarkOtpUsedAsync(string email, string code)
    {
        var otp = await _db.OtpCodes
            .FirstOrDefaultAsync(o => o.Email == email && o.Code == code);

        if (otp != null)
        {
            otp.Used = true;
            await _db.SaveChangesAsync();
        }
    }
}
