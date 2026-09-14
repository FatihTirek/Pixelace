using System.ComponentModel.DataAnnotations;

namespace Backend.src.DTOs
{
    public record PlacePixelRequest(
        [property: Range(0, Constants.TotalPixels - 1, ErrorMessage = "Canvas index must be between 0 and 999999.")]
        int CanvasIndex,

        [property: Range(0, Constants.PaletteCount - 1, ErrorMessage = "Color index must be between 0 and 31.")]
        int ColorIndex
    );
}
