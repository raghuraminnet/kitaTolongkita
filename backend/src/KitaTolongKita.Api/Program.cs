using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using KitaTolongKita.Api.Services;
using Nest;
using Hellang.Middleware.ProblemDetails;
using KitaTolongKita.Core.Interfaces;
using KitaTolongKita.Infrastructure.Data;
using KitaTolongKita.Infrastructure.Services;

// ── PostgreSQL DateTime fix: allow UTC DateTime without Kind=Utc ───────────────────────
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

// ── Database ───────────────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")
        ?? "Host=localhost;Database=kitatolongkita;Username=postgres;Password=postgres"));

builder.Services.AddMemoryCache();
builder.Services.AddHostedService<ConfigReloadService>();

// ── Redis Distributed Cache ─────────────────────────────────────────────────
var redisUrl = builder.Configuration["Redis:Url"] ?? "redis://redis:6379";
builder.Services.AddStackExchangeRedisCache(opts =>
{
    opts.Configuration = redisUrl;
    opts.InstanceName = "kita:";
});
builder.Services.AddScoped<ICacheService, RedisCacheService>();

// ── ElasticSearch ────────────────────────────────────────────────────────────
builder.Services.AddSingleton<IElasticClient>(sp =>
{
    var settings = new ConnectionSettings(
        new Uri(builder.Configuration["ElasticSearch:Url"] ?? "http://localhost:9200"))
        .DefaultIndex("deals")
        .EnableDebugMode();
    return new ElasticClient(settings);
});

// ── HTTP Client for AI providers ───────────────────────────────────────────────
builder.Services.AddHttpClient();

// ── AI Config Provider (hot-reload from env + Redis) ───────────────────────────
builder.Services.AddSingleton<IAiConfigProvider, AiConfigProvider>();

// ── AI Moderation ──────────────────────────────────────────────────────────────
// Provider is selected via AI__Provider config: azure-openai | openai | anthropic
// Moderation services read config via IAiConfigProvider which supports hot-reload from Redis.
builder.Services.AddScoped<IModerationService>(sp =>
{
    var httpFactory = sp.GetRequiredService<IHttpClientFactory>();
    var http = httpFactory.CreateClient();
    var aiCfg = sp.GetRequiredService<IAiConfigProvider>();
    var config = sp.GetRequiredService<Microsoft.Extensions.Configuration.IConfiguration>();
    var logger = sp.GetRequiredService<ILogger<AzureOpenAiModerationService>>();
    var provider = (aiCfg.Provider ?? config["AI:Provider"] ?? "azure-openai").ToLowerInvariant();

    return provider switch
    {
        "openai" => (IModerationService)new OpenAiModerationService(http, aiCfg,
            sp.GetRequiredService<ILogger<OpenAiModerationService>>()),
        "anthropic" => new AnthropicModerationService(http, aiCfg,
            sp.GetRequiredService<ILogger<AnthropicModerationService>>()),
        _ => new AzureOpenAiModerationService(http, config, logger)
    };
});

// ── Background Services ─────────────────────────────────────────────────────────
builder.Services.AddSingleton<ModerationQueueService>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<ModerationQueueService>());
builder.Services.AddSingleton<ElasticsearchCleanupService>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<ElasticsearchCleanupService>());
builder.Services.AddScoped<IPushNotificationService, FcmPushService>();

// ── Core Services ─────────────────────────────────────────────────────────────
builder.Services.AddSingleton<IElasticsearchService, ElasticsearchService>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IOtpService, OtpService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IDealService, DealService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<ISavedDealService, SavedDealService>();
builder.Services.AddScoped<IFollowService, FollowService>();
builder.Services.AddScoped<ICommentService, CommentService>();
builder.Services.AddScoped<IRepostService, RepostService>();
builder.Services.AddScoped<IContributorService, ContributorService>();
builder.Services.AddScoped<ILookupService, LookupService>();
builder.Services.AddScoped<IRatingService, RatingService>();

// ── JWT Authentication ────────────────────────────────────────────────────────
var jwtSecret = builder.Configuration["Jwt:Secret"] ?? "KitaTolongKita_SuperSecretKey_MinLength32Chars!";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "KitaTolongKita";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "KitaTolongKitaApp";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
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

builder.Services.AddAuthorization();

// ── API ─────────────────────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "KitaTolongKita API",
        Version = "v1",
        Description = "Malaysian community group-buying marketplace API"
    });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer {token}'",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },
            Array.Empty<string>()
        }
    });
});

// ── Problem Details ────────────────────────────────────────────────────────────
// NOTE: Hellang.Middleware.ProblemDetails conflicts with ASP.NET Core 8's built-in
// AddProblemDetails extension method. Use the Hellang extension explicitly so we
// keep the customised ProblemDetailsOptions from the package.
Hellang.Middleware.ProblemDetails.ProblemDetailsExtensions
    .AddProblemDetails(builder.Services);

// ── CORS ─────────────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowMobile", policy =>
    {
        policy.WithOrigins("exp://*", "http://localhost:*", "https://*.serveousercontent.com")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

// ── Middleware pipeline ───────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseProblemDetails();
app.UseCors("AllowMobile");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// ── Auto-migrate on startup ───────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try { db.Database.EnsureCreated(); }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogWarning(ex, "Database connection failed — ensure PostgreSQL is running.");
    }

    // Ensure Elasticsearch index exists
    try
    {
        var es = scope.ServiceProvider.GetRequiredService<IElasticsearchService>();
        await es.EnsureIndexExistsAsync();
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogWarning(ex, "Elasticsearch not available — search may be limited.");
    }
}

app.Run($"http://0.0.0.0:{builder.Configuration["App:Port"] ?? "5000"}");
