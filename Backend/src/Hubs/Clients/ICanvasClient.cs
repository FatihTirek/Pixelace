using Backend.src.DTOs;

namespace Backend.src.Hubs.Clients
{
    public interface ICanvasClient
    {
        Task ReceivePixel(PixelResponse pixel);
    }
}
