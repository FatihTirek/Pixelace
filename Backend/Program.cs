using Backend.src.Hubs;
using Backend.src.Hubs.Filters;
using Backend.src.Hubs.Providers;
using Backend.src.Services;
using Microsoft.AspNetCore.SignalR;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);

// 1. Resilient Redis Connection (Does not crash startup if Redis is temporarily cold)
var redisConnectionString = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";

builder.Services.AddSingleton<IConnectionMultiplexer>(_ =>
{
    var config = ConfigurationOptions.Parse(redisConnectionString);
    config.AbortOnConnectFail = false; // Resilient cold-start
    config.ConnectTimeout = 5000;
    config.SyncTimeout = 5000;
    return ConnectionMultiplexer.Connect(config);
});

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
}).AddStackExchangeRedis(redisConnectionString, options =>
{
    options.Configuration.ChannelPrefix = RedisChannel.Literal("Pixelace");
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();
app.UseHttpsRedirection();

app.MapControllers();
app.MapHub<ChatHub>("hub/chat");
app.MapHub<CanvasHub>("hub/canvas");

app.Run();