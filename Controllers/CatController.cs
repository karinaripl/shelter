using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using shelter2.DTOs;
using shelter2.Services;

namespace shelter2.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CatController : ControllerBase
    {
        private readonly ICatService _catService;
        public CatController(ICatService catService) => _catService = catService;

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            try { return Ok(await _catService.GetAllAsync()); }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var cat = await _catService.GetByIdAsync(id);
                if (cat == null) return NotFound(new { error = "Кошка не найдена" });
                return Ok(cat);
            }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CatCreateDto dto)
        {
            try
            {
                var id = await _catService.CreateAsync(dto);
                return Ok(new { cat_id = id });
            }
            catch (DbUpdateException ex)
            {
                return StatusCode(500, new { error = "Ошибка базы данных", details = ex.InnerException?.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] CatUpdateDto dto)
        {
            try
            {
                await _catService.UpdateAsync(id, dto);
                return NoContent();
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (DbUpdateException ex)
            {
                return StatusCode(500, new { error = "Ошибка базы данных", details = ex.InnerException?.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                await _catService.DeleteAsync(id);
                return NoContent();
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (DbUpdateException)
            {
                return BadRequest(new { error = "Нельзя удалить кошку — есть связанные записи" });
            }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }
    }
}
