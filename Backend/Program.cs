using Backend.src.Hubs;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton(ConnectionMultiplexer.Connect(Environment.GetEnvironmentVariable("CUSTOMCONNSTR_Redis")!).GetDatabase());
builder.Services.Configure<RouteOptions>(options => options.LowercaseUrls = true);

builder.Services.AddControllers();
builder.Services.AddSignalR();

var app = builder.Build();

app.UseHttpsRedirection();

app.MapControllers();
app.MapHub<ChatHub>("hub/chat");
app.MapHub<BoardHub>("hub/board");

app.Run();