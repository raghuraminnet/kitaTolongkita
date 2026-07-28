using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using KitaTolongKita.Core.Entities;
using KitaTolongKita.Core.Interfaces;

namespace KitaTolongKita.Infrastructure.Services;

public class TokenService : ITokenService
{
    private readonly string _secret;
    private readonly string _issuer;
    private readonly string _audience;
    private readonly int _accessTokenExpiryMinutes;

    public TokenService(IConfiguration configuration)
    {
        _secret = configuration["Jwt:Secret"] ?? "KitaTolongKita_SuperSecretKey_MinLength32Chars!";
        _issuer = configuration["Jwt:Issuer"] ?? "KitaTolongKita";
        _audience = configuration["Jwt:Audience"] ?? "KitaTolongKitaApp";
        _accessTokenExpiryMinutes = int.Parse(configuration["Jwt:AccessTokenExpiryMinutes"] ?? "60");
    }

    public string GenerateAccessToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.GivenName, user.FullName),
            new Claim("avatar_url", user.AvatarUrl ?? ""),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };

        var token = new JwtSecurityToken(
            issuer: _issuer,
            audience: _audience,
            claims: claims,
            expires: GetAccessTokenExpiry(),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }

    public DateTime GetAccessTokenExpiry() => DateTime.UtcNow.AddMinutes(_accessTokenExpiryMinutes);
}
