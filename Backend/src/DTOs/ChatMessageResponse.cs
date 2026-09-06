namespace Backend.src.DTOs
{
    public record ChatMessageResponse(string Username, string Room, string Color, string Text, long Timestamp);
}
