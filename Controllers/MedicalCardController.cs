using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using shelter2.DTOs;
using shelter2.Services;

namespace shelter2.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MedicalCardController : ControllerBase
    {
        private readonly IMedicalCardService _medicalCardService;
        public MedicalCardController(IMedicalCardService medicalCardService) => _medicalCardService = medicalCardService;

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            try { return Ok(await _medicalCardService.GetAllAsync()); }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpGet("cat/{catId}")]
        public async Task<IActionResult> GetByCat(int catId)
        {
            try
            {
                var card = await _medicalCardService.GetByCatAsync(catId);
                if (card == null) return NotFound(new { error = "Медкарта не найдена" });
                return Ok(card);
            }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] MedicalCardCreateDto dto)
        {
            try
            {
                var id = await _medicalCardService.CreateAsync(dto);
                return Ok(new { medical_card_id = id });
            }
            catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
            catch (DbUpdateException ex)
            {
                return StatusCode(500, new { error = "Ошибка базы данных", details = ex.InnerException?.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] MedicalCardUpdateDto dto)
        {
            try
            {
                await _medicalCardService.UpdateAsync(id, dto);
                return NoContent();
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpGet("{cardId}/records")]
        public async Task<IActionResult> GetRecords(int cardId)
        {
            try { return Ok(await _medicalCardService.GetRecordsAsync(cardId)); }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpPost("records")]
        public async Task<IActionResult> CreateRecord([FromBody] MedicalRecordCreateDto dto)
        {
            try
            {
                await _medicalCardService.CreateRecordAsync(dto);
                return NoContent();
            }
            catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
            catch (DbUpdateException ex)
            {
                return StatusCode(500, new { error = "Ошибка базы данных", details = ex.InnerException?.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpDelete("records/{employeeId}/{cardId}/{date}")]
        public async Task<IActionResult> DeleteRecord(int employeeId, int cardId, DateOnly date)
        {
            try
            {
                await _medicalCardService.DeleteRecordAsync(employeeId, cardId, date);
                return NoContent();
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }
    }
}
