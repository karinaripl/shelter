using System.ComponentModel.DataAnnotations;

namespace shelter2.DTOs
{
    // Запрос на вход
    public class LoginRequestDto
    {
        [Required(ErrorMessage = "Логин обязателен")]
        public string Login { get; set; } = string.Empty;

        [Required(ErrorMessage = "Пароль обязателен")]
        public string Password { get; set; } = string.Empty;
    }

    // Ответ после входа
    public class LoginResponseDto
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public string? UserType { get; set; } // "admin" или "employee"
        public int? EmployeeId { get; set; }
        public string? FullName { get; set; }
        public string? PositionName { get; set; } // Должность
        public string? Token { get; set; } // если будете использовать JWT
    }

    // Смена пароля
    public class ChangePasswordDto
    {
        [Required]
        public int EmployeeId { get; set; }

        [Required]
        public string OldPassword { get; set; } = string.Empty;

        [Required]
        [MinLength(6, ErrorMessage = "Новый пароль должен быть не менее 6 символов")]
        public string NewPassword { get; set; } = string.Empty;
    }
}