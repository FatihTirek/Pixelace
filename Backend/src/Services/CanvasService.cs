using Backend.src.DTOs;
using StackExchange.Redis;

namespace Backend.src.Services
{
    public class CanvasService(IConnectionMultiplexer multiplexer)
    {
        private readonly IDatabase _redis = multiplexer.GetDatabase();

        public async Task<byte[]> GetCanvasAsync()
        {
            byte[]? canvas = await _redis.StringGetAsync(Constants.RedisKeys.Canvas);
            if (canvas != null && canvas.Length == Constants.TotalPixels)
            {
                return canvas;
            }

            canvas = new byte[Constants.TotalPixels];
            await _redis.StringSetAsync(Constants.RedisKeys.Canvas, canvas);
            return canvas;
        }

        public async Task<PlacePixelResponse> TrySetPixelAsync(PlacePixelRequest request, string userId)
        {
            if (string.IsNullOrWhiteSpace(userId))
            {
                return new PlacePixelResponse(false, 0, "User identifier is required.");
            }

            string cooldownKey = GetCooldownKey(userId);
            bool acquired = await _redis.StringSetAsync(cooldownKey, "1", TimeSpan.FromSeconds(Constants.DefaultCooldownSeconds), When.NotExists);

            if (!acquired)
            {
                var ttl = await _redis.KeyTimeToLiveAsync(cooldownKey);
                int remainingSeconds = ttl.HasValue && ttl.Value.TotalSeconds > 0 ? (int)Math.Ceiling(ttl.Value.TotalSeconds) : 1;

                return new PlacePixelResponse(false, remainingSeconds, $"Cooldown is active. Please wait {remainingSeconds} seconds.");
            }

            await _redis.StringSetRangeAsync(Constants.RedisKeys.Canvas, request.CanvasIndex, new byte[] { (byte)request.ColorIndex });
            return new PlacePixelResponse(true, Constants.DefaultCooldownSeconds, Pixel: new PixelResponse(request.CanvasIndex, request.ColorIndex));
        }

        public async Task<int> GetRemainingCooldownAsync(string userId)
        {
            if (string.IsNullOrWhiteSpace(userId))
            {
                return 0;
            }

            var ttl = await _redis.KeyTimeToLiveAsync(GetCooldownKey(userId));
            return ttl.HasValue && ttl.Value.TotalSeconds > 0 ? (int)Math.Ceiling(ttl.Value.TotalSeconds) : 0;
        }

        private static string GetCooldownKey(string userId) => $"{Constants.RedisKeys.CooldownPrefix}{userId.Trim()}";
    }
}
