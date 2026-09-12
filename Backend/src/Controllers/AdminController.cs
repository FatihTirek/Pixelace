using Backend.src.DTOs;
using Backend.src.Services;
using Microsoft.AspNetCore.Mvc;
using StackExchange.Redis;

namespace Backend.src.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AdminController(GameConfigService service, IConnectionMultiplexer multiplexer, IConfiguration configuration) : ControllerBase
    {

        [HttpGet("cooldown")]
        public IActionResult GetCooldown()
        {
            if (!IsAuthorized())
            {
                return Unauthorized(new { error = "Unauthorized. Invalid or missing X-Admin-Secret." });
            }

            return Ok(new GetCooldownResponse(service.CooldownSeconds));
        }

        [HttpPost("cooldown")]
        public async Task<IActionResult> SetCooldown([FromBody] SetCooldownRequest? body, [FromQuery] int? seconds)
        {
            if (!IsAuthorized())
            {
                return Unauthorized(new { error = "Unauthorized. Invalid or missing X-Admin-Secret." });
            }

            int targetSeconds = body?.Seconds ?? seconds ?? -1;

            if (targetSeconds < 0 || targetSeconds > 3600)
            {
                return BadRequest(new { error = "Cooldown must be between 0 and 3600 seconds." });
            }

            service.CooldownSeconds = targetSeconds;
            await multiplexer.GetDatabase().StringSetAsync(Constants.RedisKeys.CooldownConfig, targetSeconds);

            return Ok(new SetCooldownResponse(true, targetSeconds, $"Cooldown successfully updated to {targetSeconds} seconds."));
        }

        [HttpPost("reset-canvas")]
        public async Task<IActionResult> ResetCanvas()
        {
            if (!IsAuthorized())
            {
                return Unauthorized(new { error = "Unauthorized. Invalid or missing X-Admin-Secret." });
            }

            var canvas = new byte[Constants.TotalPixels];
            Array.Fill(canvas, (byte)Constants.DefaultColorIndex);
            await multiplexer.GetDatabase().StringSetAsync(Constants.RedisKeys.Canvas, canvas);

            return Ok(new { success = true, message = "Canvas successfully reset to blank white." });
        }

        private bool IsAuthorized()
        {
            var secret = configuration["ADMIN_SECRET"] ?? configuration["AdminSecret"] ?? "pixelace-admin-secret-dev";

            if (!Request.Headers.TryGetValue("X-Admin-Secret", out var providedSecret) || string.IsNullOrWhiteSpace(providedSecret))
            {
                return false;
            }

            return string.Equals(providedSecret.ToString().Trim(), secret.Trim(), StringComparison.Ordinal);
        }
    }
}
