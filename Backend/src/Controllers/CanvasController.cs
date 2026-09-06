using Backend.src.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.src.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CanvasController(CanvasService service) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetCanvas()
        {
            return File(await service.GetCanvasAsync(), "application/octet-stream");
        }
    }
}
