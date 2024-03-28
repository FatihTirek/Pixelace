using Backend.src.Models;
using Microsoft.AspNetCore.SignalR;
using StackExchange.Redis;

namespace Backend.src.Hubs
{
    public class BoardHub : Hub
    {
        public async Task SendPixel(Pixel pixel, IDatabase redis)
        {
            await redis.StringSetAsync(pixel.BoardIndex.ToString(), pixel.ColorIndex);
            await Clients.Others.SendAsync("ReceivePixel", pixel);
        }
    }
}