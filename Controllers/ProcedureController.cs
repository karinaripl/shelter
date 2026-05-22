using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using shelter2.DTOs;
using shelter2.Services;

namespace shelter2.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProcedureController : ControllerBase
    {
        private readonly IProcedureService _procedureService;
        public ProcedureController(IProcedureService procedureService) => _procedureService = procedureService;

        [HttpGet("types")]
        public async Task<IActionResult> GetTypes()
        {
            try { return Ok(await _procedureService.GetTypesAsync()); }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpPost("types")]
        public async Task<IActionResult> CreateType([FromBody] ProcedureTypeCreateDto dto)
        {
            try
            {
                await _procedureService.CreateTypeAsync(dto);
                return Ok(new { dto.procedure_type_name });
            }
            catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpPut("types/{name}")]
        public async Task<IActionResult> UpdateType(string name, [FromBody] ProcedureTypeCreateDto dto)
        {
            try
            {
                await _procedureService.UpdateTypeAsync(name, dto);
                return NoContent();
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpDelete("types/{name}")]
        public async Task<IActionResult> DeleteType(string name)
        {
            try
            {
                await _procedureService.DeleteTypeAsync(name);
                return NoContent();
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (DbUpdateException)
            {
                return BadRequest(new { error = "Нельзя удалить тип — есть связанные записи процедур" });
            }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpGet("records")]
        public async Task<IActionResult> GetRecords()
        {
            try { return Ok(await _procedureService.GetRecordsAsync()); }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpPost("records")]
        public async Task<IActionResult> CreateRecord([FromBody] ProcedureRecordCreateDto dto)
        {
            try
            {
                await _procedureService.CreateRecordAsync(dto);
                return NoContent();
            }
            catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
            catch (DbUpdateException ex)
            {
                return StatusCode(500, new { error = "Ошибка базы данных", details = ex.InnerException?.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpDelete("records/{employeeId}/{typeName}/{catId}/{date}")]
        public async Task<IActionResult> DeleteRecord(int employeeId, string typeName, int catId, DateOnly date)
        {
            try
            {
                await _procedureService.DeleteRecordAsync(employeeId, typeName, catId, date);
                return NoContent();
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }
    }
}
