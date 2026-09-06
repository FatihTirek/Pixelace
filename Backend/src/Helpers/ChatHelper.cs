namespace Backend.src.Helpers
{
    public static class ChatHelper
    {
        public const string DefaultRoom = "EN";

        public static string NormalizeRoom(string? room) => string.IsNullOrWhiteSpace(room) ? DefaultRoom : room.Trim().ToUpperInvariant();
    }
}
