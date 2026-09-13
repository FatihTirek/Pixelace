using Backend.src.DTOs;
using Backend.src.Hubs.Clients;
using Backend.src.Services;
using Microsoft.AspNetCore.SignalR;

namespace Backend.src.Hubs
{
    public class CanvasHub(CanvasService service) : Hub<ICanvasClient>
    {
        public async Task<PlacePixelResponse> SendPixel(PlacePixelRequest request)
        {
            var result = await service.TrySetPixelAsync(request, Context.UserIdentifier!);

            if (result.Pixel != null)
            {
                await Clients.Others.ReceivePixel(result.Pixel);
            }

            return result;
        }

        public async Task<int> GetRemainingCooldown()
        {
            return await service.GetRemainingCooldownAsync(Context.UserIdentifier!);
        }
    }
}
