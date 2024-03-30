using Backend.src.Hubs;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton(ConnectionMultiplexer.Connect(builder.Configuration.GetConnectionString("Redis")!).GetDatabase());
builder.Services.Configure<RouteOptions>(options => options.LowercaseUrls = true);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddControllers();
builder.Services.AddSignalR();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();
app.UseHttpsRedirection();
app.UseCors(builder => builder.WithOrigins("http://127.0.0.1:5500").AllowAnyHeader().AllowAnyMethod().AllowCredentials());

app.MapControllers();
app.MapHub<ChatHub>("hub/chat");
app.MapHub<BoardHub>("hub/board");

app.Run();