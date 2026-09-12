using Backend.src.Hubs;
using Backend.src.Hubs.Filters;
using Backend.src.Hubs.Providers;
using Backend.src.Services;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.AspNetCore.SignalR;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);

// 1. Resilient Redis Connection (Supports both rediss:// URLs and host:port strings)
var rawRedisConnectionString = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";

static ConfigurationOptions ParseRedisOptions(string rawConnection)
{
    ConfigurationOptions options;
    if (rawConnection.StartsWith("redis://", StringComparison.OrdinalIgnoreCase) ||
        rawConnection.StartsWith("rediss://", StringComparison.OrdinalIgnoreCase))
    {
        var uri = new Uri(rawConnection);
        bool isSsl = rawConnection.StartsWith("rediss://", StringComparison.OrdinalIgnoreCase);
        options = new ConfigurationOptions
        {
            EndPoints = { { uri.Host, uri.Port > 0 ? uri.Port : 6379 } },
            Ssl = isSsl,
            SslHost = isSsl ? uri.Host : null,
            SslProtocols = System.Security.Authentication.SslProtocols.Tls12 | System.Security.Authentication.SslProtocols.Tls13,
            AbortOnConnectFail = false,
            ConnectTimeout = 15000,
            SyncTimeout = 15000,
            KeepAlive = 30
        };

        if (!string.IsNullOrEmpty(uri.UserInfo))
        {
            var parts = uri.UserInfo.Split(':', 2);
            options.Password = parts.Length == 2 ? parts[1] : parts[0];
        }
    }
    else
    {
        options = ConfigurationOptions.Parse(rawConnection);
        options.AbortOnConnectFail = false;
        options.ConnectTimeout = 15000;
        options.SyncTimeout = 15000;
        options.KeepAlive = 30;
        if (options.Ssl)
        {
            options.SslProtocols = System.Security.Authentication.SslProtocols.Tls12 | System.Security.Authentication.SslProtocols.Tls13;
            if (options.EndPoints.FirstOrDefault() is System.Net.DnsEndPoint host && string.IsNullOrEmpty(options.SslHost))
            {
                options.SslHost = host.Host;
            }
        }
    }

    // Upstash TLS certificate validation handler
    options.CertificateValidation += (_, _, _, _) => true;

    return options;
}

var redisOptions = ParseRedisOptions(rawRedisConnectionString);

builder.Services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(redisOptions));

// 2. Domain & Application Services
builder.Services.AddSingleton<GameConfigService>();
builder.Services.AddScoped<CanvasService>();
builder.Services.AddScoped<ChatService>();
builder.Services.AddSingleton<IUserIdProvider, QueryUserIdProvider>();

// 3. Response Compression (Brotli + Gzip for 1MB raw canvas binary and APIs)
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
    options.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(["application/octet-stream"]);
});

builder.Services.Configure<BrotliCompressionProviderOptions>(options =>
{
    options.Level = System.IO.Compression.CompressionLevel.Fastest;
});

builder.Services.Configure<GzipCompressionProviderOptions>(options =>
{
    options.Level = System.IO.Compression.CompressionLevel.Fastest;
});

// 4. Routing & Controllers
builder.Services.Configure<RouteOptions>(options => options.LowercaseUrls = true);
builder.Services.AddControllers();
builder.Services.AddOpenApi();

// 5. CORS (Allows SignalR credentials & WebSockets from frontend)
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// 6. SignalR with MessagePack binary protocol and Redis Backplane support
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = builder.Environment.IsDevelopment();
    options.AddFilter<ValidationHubFilter>();
})
.AddMessagePackProtocol()
.AddStackExchangeRedis(options =>
{
    options.Configuration = redisOptions;
    options.Configuration.ChannelPrefix = RedisChannel.Literal("Pixelace");
});

var app = builder.Build();

// 7. Load persisted dynamic configurations (single Redis read on startup)
var configService = app.Services.GetRequiredService<GameConfigService>();
try
{
    var redisMultiplexer = app.Services.GetRequiredService<IConnectionMultiplexer>();
    var redisDb = redisMultiplexer.GetDatabase();
    var savedCooldown = await redisDb.StringGetAsync(Backend.src.Constants.RedisKeys.CooldownConfig);
    if (savedCooldown.HasValue && int.TryParse((string?)savedCooldown, out int seconds) && seconds >= 0)
    {
        configService.CooldownSeconds = seconds;
        app.Logger.LogInformation("Loaded dynamic cooldown config from Redis: {Seconds}s", seconds);
    }
}
catch (Exception ex)
{
    app.Logger.LogWarning(ex, "Could not load initial cooldown from Redis. Using default {Seconds}s", configService.CooldownSeconds);
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseHttpsRedirection();
}

app.UseResponseCompression();
app.UseCors();

app.MapControllers();
app.MapHub<ChatHub>("hub/chat");
app.MapHub<CanvasHub>("hub/canvas");

app.Run();