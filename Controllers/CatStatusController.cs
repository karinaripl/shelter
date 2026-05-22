using Microsoft.AspNetCore.Mvc;
using shelter2.Services;

namespace shelter2.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CatStatusController : ControllerBase
    {
        private readonly ICatStatusService _catStatusService;
        public CatStatusController(ICatStatusService catStatusService) => _catStatusService = catStatusService;

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            try { return Ok(await _catStatusService.GetAllAsync()); }
            catch (Exception ex) { return StatusCode(500, new { error = ex.Message }); }
        }
    }
}
