using Microsoft.EntityFrameworkCore;
using shelter2.DTOs;
using shelter2.Models;

namespace shelter2.Services
{
    public class AuthService : IAuthService
    {
        private readonly CatDbContext _context;

        public AuthService(CatDbContext context)
        {
            _context = context;
        }

        public async Task<LoginResponseDto> LoginAsync(LoginRequestDto request)
        {
            // Ищем сотрудника по логину
            var employee = await _context.employees
                .FirstOrDefaultAsync(e => e.login != null && e.login == request.Login);

            if (employee == null)
            {
                return new LoginResponseDto
                {
                    Success = false,
                    Message = "Неверный логин или пароль"
                };
            }

            // ⚠️ ЗДЕСЬ - ИСПОЛЬЗУЙТЕ ПРАВИЛЬНОЕ ИМЯ ПОЛЯ
            if (employee.password != request.Password)  // ← если поле называется password
            {
                return new LoginResponseDto
                {
                    Success = false,
                    Message = "Неверный логин или пароль"
                };
            }

            bool isAdmin = employee.position_name != null &&
                           (employee.position_name.ToLower() == "admin" ||
                            employee.position_name.ToLower() == "администратор");

            string userType = isAdmin ? "admin" : "employee";

            return new LoginResponseDto
            {
                Success = true,
                Message = "Вход выполнен успешно",
                UserType = userType,
                EmployeeId = employee.employee_id,
                FullName = employee.full_name,
                PositionName = employee.position_name
            };
        }

        public async Task<bool> ChangePasswordAsync(ChangePasswordDto request)
        {
            var employee = await _context.employees
                .FirstOrDefaultAsync(e => e.employee_id == request.EmployeeId);

            if (employee == null)
                return false;

            // ⚠️ И ЗДЕСЬ ТОЖЕ
            if (employee.password != request.OldPassword)  // ← если поле называется password
                return false;

            employee.password = request.NewPassword;  // ← если поле называется password

            try
            {
                await _context.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<bool> EmployeeExistsAsync(string login)
        {
            return await _context.employees
                .AnyAsync(e => e.login != null && e.login == login);
        }
    }
}