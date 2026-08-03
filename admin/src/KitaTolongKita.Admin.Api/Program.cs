using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using KitaTolongKita.Admin.Api.Data;
using KitaTolongKita.Admin.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// ── PostgreSQL DateTime fix ──────────────────────────────────────────────────────
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

// ── Databases ────────────────────────────────────────────────────────────────────
var connString = builder.Configuration.GetConnectionString("Default")
    ?? "Host=postgres;Database=kitatolongkita_admin;Username=postgres;Password=postgres";

builder.Services.AddDbContext<AdminDbContext>(opts => opts.UseNpgsql(connString));

// ── HTTP client for Kita API (main app DB reads/writes) ─────────────────────────
builder.Services.AddHttpClient<IMainApiClient, MainApiClient>();

// ── Redis Distributed Cache ───────────────────────────────────────────────────────
var adminRedisUrl = builder.Configuration["Redis:Url"] ?? "redis://redis:6379";
builder.Services.AddStackExchangeRedisCache(opts =>
{
    opts.Configuration = adminRedisUrl;
    opts.InstanceName = "kita-admin:";
});

// ── Redis ────────────────────────────────────────────────────────────────────────
builder.Services.AddSingleton<IConfigSyncService, RedisConfigSyncService>();

// ── JWT Auth ────────────────────────────────────────────────────────────────────
var jwtSecret = builder.Configuration["Jwt:Secret"] ?? "KitaTolongKita-Admin-Secret-Key-2024!@#$";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "KitaTolongKitaAdmin";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "KitaTolongKitaAdminPortal";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opts =>
    {
        opts.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true, ValidateAudience = true,
            ValidateLifetime = true, ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer, ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });

builder.Services.AddAuthorization(opts =>
{
    opts.AddPolicy("SuperAdmin", p => p.RequireRole("SuperAdmin"));
    opts.AddPolicy("Moderator", p => p.RequireRole("SuperAdmin", "Moderator"));
    opts.AddPolicy("Viewer", p => p.RequireRole("SuperAdmin", "Moderator", "Viewer"));
});

// ── Services ─────────────────────────────────────────────────────────────────────
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IAdminService, AdminService>();
builder.Services.AddScoped<IAiTestService, AiTestService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();

// ── Swagger ──────────────────────────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "KitaTolongKita Admin API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization", Type = SecuritySchemeType.Http, Scheme = "bearer", BearerFormat = "JWT"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        { new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }, Array.Empty<string>() }
    });
});

builder.Services.AddControllers();
builder.Services.AddCors(opts => opts.AddPolicy("AllowPortal", p =>
    p.WithOrigins("http://76.13.219.191:3005", "http://76.13.219.191:3000")
        .AllowAnyMethod().AllowAnyHeader().AllowCredentials()));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AdminDbContext>();
    db.Database.EnsureCreated();

    // Migrate: add missing columns to existing admin_users table (PostgreSQL stores unquoted names as lowercase)
    try
    {
        db.Database.ExecuteSqlRaw(@"
            ALTER TABLE adminusers ADD COLUMN IF NOT EXISTS ""PasswordResetToken"" VARCHAR(500);
            ALTER TABLE adminusers ADD COLUMN IF NOT EXISTS ""PasswordResetTokenExpiry"" TIMESTAMP;
        ");
    }
    catch { /* columns may already exist */ }
}

app.UseCors("AllowPortal"); // ← MUST be first to handle OPTIONS preflight before routing
app.UseSwagger();
app.UseSwaggerUI();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

var port = builder.Configuration["App:Port"] ?? "5001";
app.Run($"http://0.0.0.0:{port}");
