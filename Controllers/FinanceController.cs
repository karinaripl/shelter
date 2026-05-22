using Microsoft.AspNetCore.Mvc;
using shelter2.DTOs;
using shelter2.Services;

namespace shelter2.Controllers;

[Route("api/[controller]")]
[ApiController]
public class FinanceController : ControllerBase
{
    private readonly IFinanceService _financeService;
    public FinanceController(IFinanceService financeService) => _financeService = financeService;

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        try { return Ok(await _financeService.GetSummaryAsync()); }
        catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
    }

    [HttpGet("supply-expenses")]
    public async Task<IActionResult> GetSupplyExpenses()
    {
        try { return Ok(await _financeService.GetSupplyExpensesAsync()); }
        catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
    }

    [HttpGet("donations")]
    public async Task<IActionResult> GetDonations()
    {
        try { return Ok(await _financeService.GetDonationsAsync()); }
        catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
    }

    [HttpPost("donations")]
    public async Task<IActionResult> CreateDonation([FromBody] DonationCreateDto dto)
    {
        try { return Ok(await _financeService.CreateDonationAsync(dto)); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
        catch (Exception ex) { return StatusCode(500, new { error = FriendlyDbError(ex) }); }
    }

    [HttpDelete("donations/{sourceId}")]
    public async Task<IActionResult> DeleteDonation(int sourceId)
    {
        try
        {
            await _financeService.DeleteDonationAsync(sourceId);
            return NoContent();
        }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
        catch (Exception ex) { return StatusCode(500, new { error = FriendlyDbError(ex) }); }
    }

    [HttpGet("salaries")]
    public async Task<IActionResult> GetSalaries()
    {
        try { return Ok(await _financeService.GetSalariesAsync()); }
        catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
    }

    [HttpGet("salary-preview")]
    public async Task<IActionResult> GetSalaryPreview([FromQuery] int year, [FromQuery] int month)
    {
        try { return Ok(await _financeService.GetSalaryPreviewAsync(year, month)); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
        catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
    }

    [HttpPost("pay-salaries")]
    public async Task<IActionResult> PaySalaries([FromBody] PaySalariesDto dto)
    {
        try { return Ok(await _financeService.PaySalariesAsync(dto)); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
        catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
    }

    [HttpGet("benefactors")]
    public async Task<IActionResult> GetBenefactors()
    {
        try { return Ok(await _financeService.GetBenefactorsAsync()); }
        catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
    }

    [HttpGet("products")]
    public async Task<IActionResult> GetProducts()
    {
        try { return Ok(await _financeService.GetProductsAsync()); }
        catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
    }

    private static string FriendlyDbError(Exception ex)
    {
        var msg = ex.InnerException?.Message ?? ex.Message;
        if (msg.Contains("23505")) return "Такая запись уже существует.";
        if (msg.Contains("23503")) return "Связанная запись не найдена. Проверьте данные.";
        if (msg.Contains("23502")) return "Не заполнено обязательное поле.";
        if (msg.Contains("23514")) return "Недопустимое значение поля.";
        return "Не удалось сохранить данные. Попробуйте ещё раз.";
    }
}
