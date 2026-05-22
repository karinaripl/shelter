using Microsoft.EntityFrameworkCore;
using shelter2.DTOs;
using shelter2.Models;

namespace shelter2.Services;

public class CatService : ICatService
{
    private readonly CatDbContext _context;
    public CatService(CatDbContext context) => _context = context;

    public async Task<object> GetAllAsync()
    {
        var result = await _context.cats
            .Include(c => c.status)
            .Include(c => c.cage)
            .Select(c => new {
                c.cat_id, c.name, c.breed, c.color, c.gender,
                c.birth_date, c.departure_date, c.source_of_arrival,
                c.character, c.special_marks, c.status_id,
                status_name = c.status.name,
                c.cage_id,
                cage_number = c.cage.number
            }).ToListAsync();
        return result;
    }

    public async Task<object?> GetByIdAsync(int id)
    {
        var cat = await _context.cats
            .Include(c => c.status)
            .Include(c => c.cage)
            .Where(c => c.cat_id == id)
            .Select(c => new {
                c.cat_id, c.name, c.breed, c.color, c.gender,
                c.birth_date, c.departure_date, c.source_of_arrival,
                c.character, c.special_marks, c.status_id,
                status_name = c.status.name,
                c.cage_id,
                cage_number = c.cage.number
            }).FirstOrDefaultAsync();
        return cat;
    }

    public async Task<int> CreateAsync(CatCreateDto dto)
    {
        var cageId = dto.cage_id ?? throw new ArgumentException("Клетка обязательна при добавлении кошки");

        var cage = await _context.cages
            .Include(c => c.cats)
            .FirstOrDefaultAsync(c => c.cage_id == cageId)
            ?? throw new KeyNotFoundException("Клетка не найдена");

        var occupiedCount = cage.cats.Count(c => c.departure_date == null);
        if (occupiedCount >= cage.capacity)
            throw new InvalidOperationException(
                $"Клетка №{cage.number} заполнена (вместимость: {cage.capacity}, занято: {occupiedCount})");

        var cat = new cat
        {
            name = dto.name, breed = dto.breed, color = dto.color,
            gender = string.IsNullOrEmpty(dto.gender) ? null : dto.gender[0],
            birth_date = dto.birth_date,
            departure_date = dto.departure_date,
            source_of_arrival = dto.source_of_arrival,
            character = dto.character, special_marks = dto.special_marks,
            status_id = dto.status_id,
            cage_id = cageId
        };
        _context.cats.Add(cat);
        await _context.SaveChangesAsync();
        return cat.cat_id;
    }

    public async Task UpdateAsync(int id, CatUpdateDto dto)
    {
        var cat = await _context.cats.FindAsync(id)
            ?? throw new KeyNotFoundException("Кошка не найдена");

        if (dto.cage_id.HasValue && dto.cage_id.Value != cat.cage_id)
        {
            var newCage = await _context.cages
                .Include(c => c.cats)
                .FirstOrDefaultAsync(c => c.cage_id == dto.cage_id.Value)
                ?? throw new KeyNotFoundException("Клетка не найдена");

            var occupiedCount = newCage.cats.Count(c => c.departure_date == null && c.cat_id != id);
            if (occupiedCount >= newCage.capacity)
                throw new InvalidOperationException(
                    $"Клетка №{newCage.number} заполнена (вместимость: {newCage.capacity}, занято: {occupiedCount})");
        }

        cat.name = dto.name; cat.breed = dto.breed; cat.color = dto.color;
        cat.gender = string.IsNullOrEmpty(dto.gender) ? null : dto.gender[0];
        cat.birth_date = dto.birth_date;
        cat.departure_date = dto.departure_date;
        cat.source_of_arrival = dto.source_of_arrival;
        cat.character = dto.character; cat.special_marks = dto.special_marks;
        cat.status_id = dto.status_id;
        if (dto.cage_id.HasValue) cat.cage_id = dto.cage_id.Value;

        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(int id)
    {
        var cat = await _context.cats.FindAsync(id)
            ?? throw new KeyNotFoundException("Кошка не найдена");
        _context.cats.Remove(cat);
        await _context.SaveChangesAsync();
    }
}
