using Backend.src.DTOs;
using Backend.src.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.src.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController(ChatService service) : ControllerBase
    {
        [HttpGet("messages")]
        public async Task<ActionResult<List<ChatMessageResponse>>> GetMessages([FromQuery] string? room)
        {
            return Ok(await service.GetRecentMessagesAsync(room ?? string.Empty));
        }
    }
}