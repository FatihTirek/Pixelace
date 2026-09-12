using Backend.src.Hubs;
using Backend.src.Hubs.Filters;
using Backend.src.Hubs.Providers;
using Backend.src.Services;
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
        options = new ConfigurationOptions
        {
            EndPoints = { { uri.Host, uri.Port > 0 ? uri.Port : 6379 } },
            Ssl = rawConnection.StartsWith("rediss://", StringComparison.OrdinalIgnoreCase),
            AbortOnConnectFail = false,
            ConnectTimeout = 10000,
            SyncTimeout = 10000
        };

        if (!string.IsNullOrEmpty(uri.UserInfo))
        {
            var parts = uri.UserInfo.Split(':', 2);
            if (parts.Length == 2)
            {
                options.User = parts[0];
                options.Password = parts[1];
            }
            else
            {
                options.Password = parts[0];
            }
        }
    }
    else
    {
        options = ConfigurationOptions.Parse(rawConnection);
        options.AbortOnConnectFail = false;
        options.ConnectTimeout = 10000;
        options.SyncTimeout = 10000;
    }

    return options;
}

var redisOptions = ParseRedisOptions(rawRedisConnectionString);

builder.Services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(redisOptions));

// 2. Domain & Application Services
builder.Services.AddScoped<CanvasService>();
builder.Services.AddScoped<ChatService>();
builder.Services.AddSingleton<IUserIdProvider, QueryUserIdProvider>();

// 3. Routing & Controllers
builder.Services.Configure<RouteOptions>(options => options.LowercaseUrls = true);
builder.Services.AddControllers();
builder.Services.AddOpenApi();

// 4. CORS (Allows SignalR credentials & WebSockets from frontend)
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

// 5. SignalR with Redis Backplane support for horizontal scaling
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = builder.Environment.IsDevelopment();
    options.AddFilter<ValidationHubFilter>();
}).AddStackExchangeRedis(options =>
{
    options.Configuration = redisOptions;
    options.Configuration.ChannelPrefix = RedisChannel.Literal("Pixelace");
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseHttpsRedirection();
}

app.UseCors();

app.MapControllers();
app.MapHub<ChatHub>("hub/chat");
app.MapHub<CanvasHub>("hub/canvas");

app.Run();