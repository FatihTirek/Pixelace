using Microsoft.AspNetCore.SignalR;

namespace Backend.src.Hubs.Providers
{
    public class QueryUserIdProvider : IUserIdProvider
    {
        public string? GetUserId(HubConnectionContext connection)
        {
            var userId = connection.GetHttpContext()?.Request.Query["userId"].FirstOrDefault();
            return !string.IsNullOrWhiteSpace(userId) ? userId.Trim() : connection.ConnectionId;
        }
    }
}
