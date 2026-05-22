using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using shelter2.DTOs;
using shelter2.Services;

namespace shelter2.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EmployeeController : ControllerBase
    {
        private readonly IEmployeeService _employeeService;
        public EmployeeController(IEmployeeService employeeService) => _employeeService = employeeService;

        [HttpGet]
        public async Task<IActionResult> GetEmployees()
        {
            try { return Ok(await _employeeService.GetAllAsync()); }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetEmployee(int id)
        {
            try
            {
                var emp = await _employeeService.GetByIdAsync(id);
                if (emp == null) return NotFound(new { error = "Сотрудник не найден" });
                return Ok(emp);
            }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpPost]
        public async Task<IActionResult> CreateEmployee([FromBody] EmployeeCreateDto dto)
        {
            try
            {
                var emp = await _employeeService.CreateAsync(dto);
                return CreatedAtAction(nameof(GetEmployee), new { id = emp.employee_id }, emp);
            }
            catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
            catch (DbUpdateException ex)
            {
                return StatusCode(500, new { error = "Ошибка базы данных", details = ex.InnerException?.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateEmployee(int id, [FromBody] EmployeeUpdateDto dto)
        {
            try
            {
                await _employeeService.UpdateAsync(id, dto);
                return NoContent();
            }
            catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (DbUpdateConcurrencyException)
            {
                var exists = await _employeeService.GetByIdAsync(id);
                if (exists == null) return NotFound(new { error = "Сотрудник не найден" });
                throw;
            }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEmployee(int id)
        {
            try
            {
                await _employeeService.DeleteAsync(id);
                return NoContent();
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (DbUpdateException ex)
            {
                if (ex.InnerException?.Message.Contains("foreign key") == true)
                    return BadRequest(new { error = "Нельзя удалить сотрудника — есть связанные записи (медкарты, процедуры и т.д.)" });
                return StatusCode(500, new { error = ex.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }
    }
}
