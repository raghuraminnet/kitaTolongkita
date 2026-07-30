using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using KitaTolongKita.Admin.Api.Data;
using KitaTolongKita.Admin.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// ── PostgreSQL DateTime fix ──────────────────────────────────────────────────────
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

// ── Database ────────────────────────────────────────────────────────────────────
var connString = builder.Configuration.GetConnectionString("Default")
    ?? "Host=postgres;Database=kitatolongkita_admin;Username=postgres;Password=postgres123";
var mainConnString = builder.Configuration.GetConnectionString("MainDb")
    ?? "Host=postgres;Database=kitatolongkita;Username=postgres;Password=postgres123";

builder.Services.AddDbContext<AdminDbContext>(opts =>
    opts.UseNpgsql(connString));

// Read-only connection to main DB for querying users/deals/orders
builder.Services.AddDbContext<MainDbContext>(opts =>
    opts.UseNpgsql(mainConnString), ServiceLifetime.Transient);

// ── JWT Auth ────────────────────────────────────────────────────────────────────
var jwtSecret = builder.Configuration["Jwt:Secret"] ?? "KitaTolongKita-Admin-Secret-Key-2024!@#$";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "KitaTolongKitaAdmin";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "KitaTolongKitaAdminPortal";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opts =>
    {
        opts.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
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
builder.Services.AddHttpClient();

// Register MainDbContext as a factory for injecting into services
builder.Services.AddDbContextFactory<MainDbContext>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IAdminService, AdminService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();

// ── Swagger ──────────────────────────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "KitaTolongKita Admin API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddControllers();
builder.Services.AddCors(opts =>
{
    opts.AddPolicy("AllowAll", p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

var app = builder.Build();

// ── Migrate DB on startup ─────────────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AdminDbContext>();
    db.Database.EnsureCreated();
}

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

var port = builder.Configuration["App:Port"] ?? "5001";
app.Run($"http://0.0.0.0:{port}");
