using MessagePack;

namespace Backend.src.DTOs
{
    [MessagePackObject]
    public record PixelResponse(
        [property: Key(0)] int CanvasIndex, 
        [property: Key(1)] int ColorIndex
    );
}
