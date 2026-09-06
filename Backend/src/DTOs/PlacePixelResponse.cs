namespace Backend.src.DTOs
{
    public record PlacePixelResponse(bool Success, int RemainingCooldownSeconds, string? ErrorMessage = null, PixelResponse? Pixel = null);
}
