using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using shelter2.DTOs;
using shelter2.Services;

namespace shelter2.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class WarehouseController : ControllerBase
    {
        private readonly IWarehouseService _warehouseService;
        public WarehouseController(IWarehouseService warehouseService) => _warehouseService = warehouseService;

        [HttpGet]
        public async Task<IActionResult> GetWarehouses()
        {
            try { return Ok(await _warehouseService.GetWarehousesAsync()); }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpGet("products")]
        public async Task<IActionResult> GetProducts()
        {
            try { return Ok(await _warehouseService.GetProductsAsync()); }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpPost("products")]
        public async Task<IActionResult> CreateProduct([FromBody] ProductCreateDto dto)
        {
            try
            {
                var id = await _warehouseService.CreateProductAsync(dto);
                return Ok(new { product_id = id });
            }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpPut("products/{id}")]
        public async Task<IActionResult> UpdateProduct(int id, [FromBody] ProductUpdateDto dto)
        {
            try
            {
                await _warehouseService.UpdateProductAsync(id, dto);
                return NoContent();
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpPatch("products/{id}/deactivate")]
        public async Task<IActionResult> DeactivateProduct(int id)
        {
            try
            {
                await _warehouseService.SetProductActiveAsync(id, false);
                return NoContent();
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { error = "Не удалось архивировать продукт" }); }
        }

        [HttpPatch("products/{id}/activate")]
        public async Task<IActionResult> ActivateProduct(int id)
        {
            try
            {
                await _warehouseService.SetProductActiveAsync(id, true);
                return NoContent();
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { error = "Не удалось восстановить продукт" }); }
        }

        [HttpDelete("products/{id}")]
        public async Task<IActionResult> DeleteProduct(int id)
        {
            try
            {
                await _warehouseService.DeleteProductAsync(id);
                return NoContent();
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (DbUpdateException)
            {
                return BadRequest(new { error = "Нельзя удалить продукт — есть связанные партии" });
            }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpGet("batches")]
        public async Task<IActionResult> GetBatches()
        {
            try { return Ok(await _warehouseService.GetBatchesAsync()); }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpPost("batches")]
        public async Task<IActionResult> CreateBatch([FromBody] ProductBatchCreateDto dto)
        {
            try
            {
                var id = await _warehouseService.CreateBatchAsync(dto);
                return Ok(new { batch_id = id });
            }
            catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
            catch (DbUpdateException ex)
            {
                return StatusCode(500, new { error = "Ошибка базы данных", details = ex.InnerException?.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpPatch("batches/{id}/writeoff")]
        public async Task<IActionResult> WriteOffBatch(int id)
        {
            try
            {
                await _warehouseService.WriteOffBatchAsync(id);
                return NoContent();
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpDelete("batches/{id}")]
        public async Task<IActionResult> DeleteBatch(int id)
        {
            try
            {
                await _warehouseService.DeleteBatchAsync(id);
                return NoContent();
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
            catch (DbUpdateException) { return BadRequest(new { error = "Не удалось удалить партию — она используется в других записях" }); }
            catch (Exception) { return StatusCode(500, new { error = "Произошла ошибка при удалении партии" }); }
        }

        [HttpGet("expiring")]
        public async Task<IActionResult> GetExpiring()
        {
            try { return Ok(await _warehouseService.GetExpiringAsync()); }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpGet("remains")]
        public async Task<IActionResult> GetRemains()
        {
            try { return Ok(await _warehouseService.GetRemainsAsync()); }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpGet("expenses")]
        public async Task<IActionResult> GetExpenses()
        {
            try { return Ok(await _warehouseService.GetExpensesAsync()); }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpPost("expenses")]
        public async Task<IActionResult> CreateExpense([FromBody] ProductExpenseCreateDto dto)
        {
            try
            {
                await _warehouseService.CreateExpenseAsync(dto);
                return NoContent();
            }
            catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
            catch (DbUpdateException ex) when (ex.InnerException is PostgresException pgEx)
            {
                return BadRequest(new { error = pgEx.MessageText });
            }
            catch (DbUpdateException ex)
            {
                return StatusCode(500, new { error = "Ошибка базы данных", details = ex.InnerException?.Message });
            }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }

        [HttpDelete("expenses/{employeeId}/{batchId}/{catId}/{date}")]
        public async Task<IActionResult> DeleteExpense(int employeeId, int batchId, int catId, DateOnly date)
        {
            try
            {
                await _warehouseService.DeleteExpenseAsync(employeeId, batchId, catId, date);
                return NoContent();
            }
            catch (KeyNotFoundException ex) { return NotFound(new { error = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }
    }
}
