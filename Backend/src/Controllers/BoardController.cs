using Microsoft.AspNetCore.Mvc;
using StackExchange.Redis;

namespace Backend.src.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BoardController(IDatabase redis) : ControllerBase
    {
        private static readonly RedisKey[] keys = Array.ConvertAll(Enumerable.Range(0, 1000000).ToArray(), x => (RedisKey)x.ToString());

        [HttpGet]
        public async Task GetBoard()
        {
            await Response.Body.WriteAsync(Array.ConvertAll(redis.StringGet(keys), x => (byte)(int)x));
        }
    }
}