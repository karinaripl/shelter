using Microsoft.AspNetCore.Mvc;
using shelter2.DTOs;
using shelter2.Services;

namespace shelter2.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CageController : ControllerBase
    {
        private readonly ICageService _cageService;
        public CageController(ICageService cageService) => _cageService = cageService;

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            try { return Ok(await _cageService.GetAllAsync()); }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpGet("overview")]
        public async Task<IActionResult> GetOverview()
        {
            try { return Ok(await _cageService.GetOverviewAsync()); }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpPost("move")]
        public async Task<IActionResult> MoveCat([FromBody] MoveCatDto dto)
        {
            try
            {
                await _cageService.MoveCatAsync(dto);
                return Ok(new { message = "Кошка переселена" });
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }
    }
}
