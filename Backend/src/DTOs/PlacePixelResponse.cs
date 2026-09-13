using MessagePack;

namespace Backend.src.DTOs
{
    [MessagePackObject]
    public record PlacePixelResponse(
        [property: Key(0)] int CooldownSeconds,
        [property: Key(1)] PixelResponse Pixel
    );
}
