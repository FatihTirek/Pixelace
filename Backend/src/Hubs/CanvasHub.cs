using Backend.src.DTOs;
using Backend.src.Hubs.Clients;
using Backend.src.Services;
using Microsoft.AspNetCore.SignalR;

namespace Backend.src.Hubs
{
    public class CanvasHub(CanvasService service) : Hub<ICanvasClient>
    {
        public async Task<int> SendPixel(byte[] request)
        {
            if (request == null || request.Length != 4)
            {
                throw new HubException("Invalid payload. Exactly 4 bytes required [index (24-bit), color (8-bit)].");
            }

            int canvasIndex = (request[0] << 16) | (request[1] << 8) | request[2];
            int colorIndex = request[3];

            var _request = new PlacePixelRequest(canvasIndex, colorIndex);
            var cooldown = await service.TrySetPixelAsync(_request, Context.UserIdentifier!);

            await Clients.Others.ReceivePixel(request);

            return cooldown;
        }

        public async Task<int> GetRemainingCooldown()
        {
            return await service.GetRemainingCooldownAsync(Context.UserIdentifier!);
        }
    }
}
