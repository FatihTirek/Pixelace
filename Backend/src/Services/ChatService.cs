using System.Text.Json;
using Backend.src.DTOs;
using Backend.src.Helpers;
using StackExchange.Redis;

namespace Backend.src.Services
{
    public class ChatService(IConnectionMultiplexer multiplexer)
    {
        private readonly IDatabase _redis = multiplexer.GetDatabase();
        private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

        public async Task<ChatMessageResponse?> AddMessageAsync(SendMessageRequest request)
        {
            var message = new ChatMessageResponse(
                Username: request.Username,
                Room: request.Room,
                Color: request.Color,
                Text: request.Text,
                Timestamp: DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            );

            string key = $"{Constants.RedisKeys.ChatRoomPrefix}{message.Room}";

            // Server-side atomic push & capped ring buffer (keeps last 50 messages)
            await _redis.ListRightPushAsync(key, JsonSerializer.Serialize(message, JsonOptions));
            await _redis.ListTrimAsync(key, -Constants.MaxChatHistoryPerRoom, -1);
            await _redis.KeyExpireAsync(key, TimeSpan.FromDays(7));

            return message;
        }

        public async Task<List<ChatMessageResponse>> GetRecentMessagesAsync(string room)
        {
            string key = $"{Constants.RedisKeys.ChatRoomPrefix}{ChatHelper.NormalizeRoom(room)}";
            var entries = await _redis.ListRangeAsync(key, 0, -1);
            var messages = new List<ChatMessageResponse>(entries.Length);

            foreach (var entry in entries)
            {
                if (entry.IsNullOrEmpty) continue;

                var msg = JsonSerializer.Deserialize<ChatMessageResponse>((string)entry!, JsonOptions);
                if (msg != null) messages.Add(msg);
            }

            return messages;
        }
    }
}
