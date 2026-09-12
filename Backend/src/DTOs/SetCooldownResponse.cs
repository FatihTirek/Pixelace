namespace Backend.src.DTOs
{
    public record SetCooldownResponse(bool Success, int CooldownSeconds, string Message);
}
