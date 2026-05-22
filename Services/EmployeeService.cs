using Microsoft.EntityFrameworkCore;
using shelter2.DTOs;
using shelter2.Models;

namespace shelter2.Services;

public class EmployeeService : IEmployeeService
{
    private readonly CatDbContext _context;
    public EmployeeService(CatDbContext context) => _context = context;

    public async Task<List<employee>> GetAllAsync()
    {
        return await _context.employees.ToListAsync();
    }

    public async Task<employee?> GetByIdAsync(int id)
    {
        return await _context.employees.FindAsync(id);
    }

    public async Task<employee> CreateAsync(EmployeeCreateDto dto)
    {
        if (dto == null)
            throw new InvalidOperationException("Данные сотрудника не заполнены");

        var positionExists = await _context.positions.AnyAsync(p => p.position_name == dto.position_name);
        if (!positionExists)
            throw new InvalidOperationException($"Должность '{dto.position_name}' не существует");

        if (!string.IsNullOrEmpty(dto.login))
        {
            var loginExists = await _context.employees.AnyAsync(e => e.login == dto.login);
            if (loginExists)
                throw new InvalidOperationException("Сотрудник с таким логином уже существует");
        }

        var emp = new employee
        {
            full_name = dto.full_name,
            position_name = dto.position_name,
            phone = dto.phone,
            email = dto.email,
            address = dto.address,
            passport_series = dto.passport_series,
            passport_number = dto.passport_number,
            birth_date = dto.birth_date,
            hire_date = dto.hire_date,
            termination_date = dto.termination_date,
            work_hours = dto.work_hours ?? 0,
            login = dto.login,
            password = dto.password
        };

        _context.employees.Add(emp);
        await _context.SaveChangesAsync();
        return emp;
    }

    public async Task UpdateAsync(int id, EmployeeUpdateDto dto)
    {
        if (id != dto.employee_id)
            throw new InvalidOperationException("ID не совпадает");

        var positionExists = await _context.positions.AnyAsync(p => p.position_name == dto.position_name);
        if (!positionExists)
            throw new InvalidOperationException($"Должность '{dto.position_name}' не существует");

        var emp = await _context.employees.FindAsync(id)
            ?? throw new KeyNotFoundException("Сотрудник не найден");

        emp.full_name = dto.full_name;
        emp.position_name = dto.position_name;
        emp.phone = dto.phone;
        emp.email = dto.email;
        emp.address = dto.address;
        emp.passport_series = dto.passport_series;
        emp.passport_number = dto.passport_number;
        emp.birth_date = dto.birth_date;
        emp.hire_date = dto.hire_date;
        emp.termination_date = dto.termination_date;
        emp.work_hours = dto.work_hours ?? 0;
        emp.login = dto.login;

        if (!string.IsNullOrEmpty(dto.password))
            emp.password = dto.password;

        _context.Entry(emp).State = EntityState.Modified;
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(int id)
    {
        var emp = await _context.employees.FindAsync(id)
            ?? throw new KeyNotFoundException("Сотрудник не найден");
        _context.employees.Remove(emp);
        await _context.SaveChangesAsync();
    }
}
