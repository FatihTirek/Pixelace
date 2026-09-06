using Backend.src.DTOs;
using Backend.src.Helpers;
using Backend.src.Hubs.Clients;
using Backend.src.Services;
using Microsoft.AspNetCore.SignalR;

namespace Backend.src.Hubs
{
    public class ChatHub(ChatService service) : Hub<IChatClient>
    {
        public async Task<bool> SendRoomMessage(SendMessageRequest request)
        {
            var message = await service.AddMessageAsync(request);
            if (message == null)
            {
                return false;
            }

            await Clients.Group(message.Room).ReceiveChatMessage(message);
            return true;
        }

        public async Task<List<ChatMessageResponse>> JoinRoom(string room)
        {
            room = ChatHelper.NormalizeRoom(room);
            await Groups.AddToGroupAsync(Context.ConnectionId, room);
            return await service.GetRecentMessagesAsync(room);
        }

        public async Task LeaveRoom(string room)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, ChatHelper.NormalizeRoom(room));
        }
    }
}