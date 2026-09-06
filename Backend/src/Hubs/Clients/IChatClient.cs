using Backend.src.DTOs;

namespace Backend.src.Hubs.Clients
{
    public interface IChatClient
    {
        Task ReceiveChatMessage(ChatMessageResponse message);
    }
}
