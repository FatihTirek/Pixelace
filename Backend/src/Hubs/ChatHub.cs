using Backend.src.Models;
using Microsoft.AspNetCore.SignalR;

namespace Backend.src.Hubs
{
    public class ChatHub : Hub
    {
        public async Task SendGroupMessage(Message message)
        {
            await Clients.OthersInGroup(message.Group).SendAsync("ReceiveGroupMessage" + message.Group, message);
        }

        public async Task AddToGroup(string group)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, group);
        }
    }
}