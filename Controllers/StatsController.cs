using Microsoft.AspNetCore.Mvc;
using shelter2.DTOs;
using shelter2.Services;

namespace shelter2.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class StatsController : ControllerBase
    {
        private readonly IStatsService _statsService;
        public StatsController(IStatsService statsService) => _statsService = statsService;

        [HttpGet]
        public async Task<ActionResult<StatsDto>> GetStats()
        {
            try { return Ok(await _statsService.GetStatsAsync()); }
            catch (Exception ex)
            {
                Console.WriteLine($"Ошибка статистики: {ex.Message}");
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}
