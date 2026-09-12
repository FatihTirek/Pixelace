using System.ComponentModel.DataAnnotations;

namespace Backend.src.DTOs
{
    public record SetCooldownRequest(
        [Range(0, 3600, ErrorMessage = "Cooldown must be between 0 and 3600 seconds.")]
        int Seconds
    );
}
