using Microsoft.AspNetCore.Mvc;
using shelter2.DTOs;
using shelter2.Services;

namespace shelter2.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("login")]
        public async Task<ActionResult<LoginResponseDto>> Login([FromBody] LoginRequestDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _authService.LoginAsync(request);

            if (!result.Success)
                return Unauthorized(result);

            return Ok(result);
        }

        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _authService.ChangePasswordAsync(request);

            if (!result)
                return BadRequest(new { message = "Не удалось сменить пароль. Проверьте старый пароль." });

            return Ok(new { message = "Пароль успешно изменён" });
        }

        [HttpGet("exists/{login}")]
        public async Task<IActionResult> EmployeeExists(string login)
        {
            var exists = await _authService.EmployeeExistsAsync(login);
            return Ok(new { exists });
        }
    }
}