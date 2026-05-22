using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using shelter2.DTOs;
using shelter2.Services;

namespace shelter2.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EventController : ControllerBase
    {
        private readonly IEventService _eventService;
        public EventController(IEventService eventService) => _eventService = eventService;

        [HttpGet]
        public async Task<IActionResult> GetEvents()
        {
            try { return Ok(await _eventService.GetAllAsync()); }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpGet("adoption-stats")]
        public async Task<IActionResult> GetAdoptionStats()
        {
            try { return Ok(await _eventService.GetAdoptionStatsAsync()); }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpPost]
        public async Task<IActionResult> CreateEvent([FromBody] EventCreateDto dto)
        {
            try
            {
                var id = await _eventService.CreateEventAsync(dto);
                return Ok(new { event_id = id });
            }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateEvent(int id, [FromBody] EventCreateDto dto)
        {
            try
            {
                await _eventService.UpdateEventAsync(id, dto);
                return NoContent();
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEvent(int id)
        {
            try
            {
                await _eventService.DeleteEventAsync(id);
                return NoContent();
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (DbUpdateException)
            {
                return BadRequest(new { error = "Нельзя удалить мероприятие — есть связанные записи" });
            }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpGet("{id}/cats")]
        public async Task<IActionResult> GetParticipations(int id)
        {
            try { return Ok(await _eventService.GetParticipationsAsync(id)); }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpPost("{id}/cats")]
        public async Task<IActionResult> AddCat(int id, [FromBody] EventCatDto dto)
        {
            try
            {
                await _eventService.AddCatAsync(id, dto);
                return NoContent();
            }
            catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpPut("{id}/cats/{catId}")]
        public async Task<IActionResult> UpdateCatCondition(int id, int catId, [FromBody] EventCatDto dto)
        {
            try
            {
                await _eventService.UpdateCatConditionAsync(id, catId, dto);
                return NoContent();
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpDelete("{id}/cats/{catId}")]
        public async Task<IActionResult> RemoveCat(int id, int catId)
        {
            try
            {
                await _eventService.RemoveCatAsync(id, catId);
                return NoContent();
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }
    }
}
