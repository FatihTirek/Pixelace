namespace Backend.src
{
    public static class Constants
    {
        public const int CanvasSize = 1000;
        public const int TotalPixels = CanvasSize * CanvasSize;
        public const int PaletteCount = 32; // 0 to 31
        public const int DefaultColorIndex = 31; // 31 is White (#FFFFFF)
        public const int DefaultCooldownSeconds = 3;
        
        public const int MaxChatHistoryPerRoom = 250;
        public const int MaxMessageLength = 300;
        public const int MaxUsernameLength = 24;

        public static class RedisKeys
        {
            public const string Canvas = "canvas:state";
            public const string ChatRoomPrefix = "chat:room:";
            public const string CooldownPrefix = "cooldown:pixel:";
            public const string CooldownConfig = "config:cooldown";
        }

        public static readonly string[] AllowedChatColors =
        [
            "#ff1744", "#f50057", "#d500f9", "#651fff", "#3d5afe",
            "#2979ff", "#008573", "#008c3a", "#ff6d00", "#dd2c00"
        ];
    }
}
