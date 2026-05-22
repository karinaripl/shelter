using Microsoft.EntityFrameworkCore;
using shelter2.DTOs;
using shelter2.Models;

namespace shelter2.Services;

public class ProcedureService : IProcedureService
{
    private readonly CatDbContext _context;
    public ProcedureService(CatDbContext context) => _context = context;

    public async Task<object> GetTypesAsync()
    {
        var result = await _context.procedure_types
            .Include(t => t.procedure_consumption_rates)
                .ThenInclude(r => r.product)
            .Select(t => new {
                t.procedure_type_name,
                t.description,
                consumption_rates = t.procedure_consumption_rates.Select(r => new {
                    r.product_id,
                    product_name = r.product.name,
                    unit = r.product.unit_of_measure,
                    r.standard_quantity,
                    r.notes
                })
            })
            .ToListAsync();
        return result;
    }

    public async Task CreateTypeAsync(ProcedureTypeCreateDto dto)
    {
        var exists = await _context.procedure_types
            .AnyAsync(t => t.procedure_type_name == dto.procedure_type_name);
        if (exists)
            throw new InvalidOperationException("Тип процедуры с таким названием уже существует");

        var pt = new procedure_type
        {
            procedure_type_name = dto.procedure_type_name,
            description = dto.description
        };
        _context.procedure_types.Add(pt);
        await _context.SaveChangesAsync();

        if (dto.consumption_rates?.Any() == true)
        {
            foreach (var r in dto.consumption_rates.Where(r => r.product_id > 0 && r.standard_quantity > 0))
            {
                _context.procedure_consumption_rates.Add(new procedure_consumption_rate
                {
                    procedure_type_name = dto.procedure_type_name,
                    product_id = r.product_id,
                    standard_quantity = r.standard_quantity,
                    notes = r.notes
                });
            }
            await _context.SaveChangesAsync();
        }
    }

    public async Task UpdateTypeAsync(string name, ProcedureTypeCreateDto dto)
    {
        var pt = await _context.procedure_types.FindAsync(name)
            ?? throw new KeyNotFoundException("Тип процедуры не найден");

        pt.description = dto.description;

        var oldRates = _context.procedure_consumption_rates
            .Where(r => r.procedure_type_name == name);
        _context.procedure_consumption_rates.RemoveRange(oldRates);

        if (dto.consumption_rates?.Any() == true)
        {
            foreach (var r in dto.consumption_rates.Where(r => r.product_id > 0 && r.standard_quantity > 0))
            {
                _context.procedure_consumption_rates.Add(new procedure_consumption_rate
                {
                    procedure_type_name = name,
                    product_id = r.product_id,
                    standard_quantity = r.standard_quantity,
                    notes = r.notes
                });
            }
        }

        await _context.SaveChangesAsync();
    }

    public async Task DeleteTypeAsync(string name)
    {
        var pt = await _context.procedure_types.FindAsync(name)
            ?? throw new KeyNotFoundException("Тип процедуры не найден");
        _context.procedure_types.Remove(pt);
        await _context.SaveChangesAsync();
    }

    public async Task<object> GetRecordsAsync()
    {
        var result = await _context.procedure_records
            .Include(r => r.cat)
            .Include(r => r.employee)
            .Select(r => new {
                r.employee_id,
                employee_name = r.employee.full_name,
                r.procedure_type_name,
                r.cat_id,
                cat_name = r.cat.name,
                cat_breed = r.cat.breed,
                cat_color = r.cat.color,
                r.procedure_date,
                r.result,
                r.notes
            }).OrderByDescending(r => r.procedure_date).ToListAsync();
        return result;
    }

    public async Task CreateRecordAsync(ProcedureRecordCreateDto dto)
    {
        var exists = await _context.procedure_records.AnyAsync(r =>
            r.employee_id == dto.employee_id &&
            r.procedure_type_name == dto.procedure_type_name &&
            r.cat_id == dto.cat_id &&
            r.procedure_date == dto.procedure_date);
        if (exists)
            throw new InvalidOperationException("Такая запись уже существует (сотрудник, тип, кот, дата совпадают)");

        var record = new procedure_record
        {
            employee_id         = dto.employee_id,
            procedure_type_name = dto.procedure_type_name,
            cat_id              = dto.cat_id,
            procedure_date      = dto.procedure_date,
            result              = dto.result,
            notes               = dto.notes
        };
        _context.procedure_records.Add(record);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteRecordAsync(int employeeId, string typeName, int catId, DateOnly date)
    {
        var record = await _context.procedure_records.FindAsync(employeeId, typeName, catId, date)
            ?? throw new KeyNotFoundException("Запись о процедуре не найдена");
        _context.procedure_records.Remove(record);
        await _context.SaveChangesAsync();
    }
}
