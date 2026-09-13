namespace Backend.src.DTOs
{
    public record PlacePixelResponse(int RemainingCooldownSeconds, string? ErrorMessage = null, PixelResponse? Pixel = null);
}
