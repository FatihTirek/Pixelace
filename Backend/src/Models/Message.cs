namespace Backend.src.Models
{
    public record Message
    {
        public required string Username { get; set; }
        public required string Group { get; set; }
        public required string Color { get; set; }
        public required string Text { get; set; }
    }
}