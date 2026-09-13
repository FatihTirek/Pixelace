using System.ComponentModel.DataAnnotations;
using MessagePack;

namespace Backend.src.DTOs
{
    [MessagePackObject]
    public record PlacePixelRequest(
        [property: MessagePack.Key(0)]
        [property: Range(0, Constants.TotalPixels - 1, ErrorMessage = "Canvas index must be between 0 and 999999.")]
        int CanvasIndex = 0,

        [property: MessagePack.Key(1)]
        [property: Range(0, Constants.PaletteCount - 1, ErrorMessage = "Color index must be between 0 and 31.")]
        int ColorIndex = 0
    );
}
