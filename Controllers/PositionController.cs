using Microsoft.AspNetCore.Mvc;
using shelter2.Models;
using shelter2.Services;

namespace shelter2.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PositionController : ControllerBase
    {
        private readonly IPositionService _positionService;
        public PositionController(IPositionService positionService) => _positionService = positionService;

        [HttpGet]
        public async Task<ActionResult<IEnumerable<position>>> GetPositions()
        {
            return Ok(await _positionService.GetAllAsync());
        }
    }
}
