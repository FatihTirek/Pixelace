using System.ComponentModel.DataAnnotations;

namespace Backend.src.DTOs
{
    public record PlacePixelRequest(int CanvasIndex = 0, int ColorIndex = 0)
    {
        [Range(0, Constants.TotalPixels - 1, ErrorMessage = "Canvas index must be between 0 and 999999.")]
        public int CanvasIndex { get; init; } = CanvasIndex;

        [Range(0, Constants.PaletteCount - 1, ErrorMessage = "Color index must be between 0 and 31.")]
        public int ColorIndex { get; init; } = ColorIndex;
    }
}
