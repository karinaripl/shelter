using shelter2.DTOs;
using shelter2.Models;

namespace shelter2.Services;

public interface IEmployeeService
{
    Task<List<employee>> GetAllAsync();
    Task<employee?> GetByIdAsync(int id);
    Task<employee> CreateAsync(EmployeeCreateDto dto);
    Task UpdateAsync(int id, EmployeeUpdateDto dto);
    Task DeleteAsync(int id);
}
