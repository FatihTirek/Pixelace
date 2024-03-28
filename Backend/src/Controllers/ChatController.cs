using System.Text.Json;
using Backend.src.Models;
using Microsoft.AspNetCore.Mvc;
using StackExchange.Redis;

namespace Backend.src.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController(IDatabase redis) : ControllerBase
    {
        private readonly JsonSerializerOptions options = new(JsonSerializerDefaults.Web);

        [HttpGet("group-messages")]
        public async Task<string> GetGroupMessages([FromQuery] string connectionId, string group)
        {
            return JsonSerializer.Serialize(Array.ConvertAll(await redis.ListRangeAsync($"{connectionId}:{group}"), e => (string)e!));
        }

        [HttpPost("cache-message")]
        public async Task CacheMessage([FromQuery] string connectionId, [FromBody] Message message)
        {
            var key = $"{connectionId}:{message.Group}";
            var json = JsonSerializer.Serialize(message, options);

            await redis.ListRightPushAsync(key, json);
            await redis.KeyExpireAsync(key, TimeSpan.FromMinutes(10));
        }
    }
}