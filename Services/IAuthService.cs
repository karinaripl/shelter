using shelter2.DTOs;

namespace shelter2.Services
{
    public interface IAuthService
    {
        Task<LoginResponseDto> LoginAsync(LoginRequestDto request);
        Task<bool> ChangePasswordAsync(ChangePasswordDto request);
        Task<bool> EmployeeExistsAsync(string login);
    }
}