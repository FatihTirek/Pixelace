using System.ComponentModel.DataAnnotations;
using Backend.src.Helpers;

namespace Backend.src.DTOs
{
    public record SendMessageRequest(string? Username = null, string? Room = null, string? Color = null, string Text = "")
    {
        [MaxLength(Constants.MaxUsernameLength, ErrorMessage = "Username cannot exceed 24 characters.")]
        public string Username { get; init; } = string.IsNullOrWhiteSpace(Username) ? "Anonymous" : Username.Trim();

        [MaxLength(50, ErrorMessage = "Room name cannot exceed 50 characters.")]
        public string Room { get; init; } = ChatHelper.NormalizeRoom(Room);

        [MaxLength(20, ErrorMessage = "Color code cannot exceed 20 characters.")]
        public string Color { get; init; } = Color != null && Constants.AllowedChatColors.Contains(Color) ? Color : Constants.AllowedChatColors[0];

        [Required(AllowEmptyStrings = false, ErrorMessage = "Message text is required.")]
        [MaxLength(Constants.MaxMessageLength, ErrorMessage = "Message text cannot exceed 300 characters.")]
        public string Text { get; init; } = Text?.Trim() ?? string.Empty;
    }
}
