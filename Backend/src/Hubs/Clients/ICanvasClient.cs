namespace Backend.src.Hubs.Clients
{
    public interface ICanvasClient
    {
        Task ReceivePixel(byte[] pixelBytes);
    }
}
