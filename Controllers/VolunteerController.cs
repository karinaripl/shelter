using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using shelter2.DTOs;
using shelter2.Services;

namespace shelter2.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class VolunteerController : ControllerBase
    {
        private readonly IVolunteerService _volunteerService;
        public VolunteerController(IVolunteerService volunteerService) => _volunteerService = volunteerService;

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            try { return Ok(await _volunteerService.GetAllAsync()); }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var v = await _volunteerService.GetByIdAsync(id);
                if (v == null) return NotFound(new { error = "Волонтёр не найден" });
                return Ok(v);
            }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] VolunteerCreateDto dto)
        {
            try
            {
                var id = await _volunteerService.CreateAsync(dto);
                return Ok(new { volunteer_id = id });
            }
            catch (DbUpdateException ex)
            {
                return StatusCode(500, new { error = "Ошибка базы данных", details = ex.InnerException?.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] VolunteerUpdateDto dto)
        {
            try
            {
                await _volunteerService.UpdateAsync(id, dto);
                return NoContent();
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                await _volunteerService.DeleteAsync(id);
                return NoContent();
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (DbUpdateException)
            {
                return BadRequest(new { error = "Нельзя удалить волонтёра — есть связанные записи" });
            }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpGet("cares")]
        public async Task<IActionResult> GetCares()
        {
            try { return Ok(await _volunteerService.GetCaresAsync()); }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpPost("cares")]
        public async Task<IActionResult> CreateCare([FromBody] VolunteerCareCreateDto dto)
        {
            try
            {
                await _volunteerService.CreateCareAsync(dto);
                return NoContent();
            }
            catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
            catch (DbUpdateException ex)
            {
                return StatusCode(500, new { error = "Ошибка базы данных", details = ex.InnerException?.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpPut("cares/{volunteerId}/{catId}")]
        public async Task<IActionResult> UpdateCare(int volunteerId, int catId, [FromBody] VolunteerCareCreateDto dto)
        {
            try
            {
                await _volunteerService.UpdateCareAsync(volunteerId, catId, dto);
                return NoContent();
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpDelete("cares/{volunteerId}/{catId}")]
        public async Task<IActionResult> DeleteCare(int volunteerId, int catId)
        {
            try
            {
                await _volunteerService.DeleteCareAsync(volunteerId, catId);
                return NoContent();
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }
    }
}
