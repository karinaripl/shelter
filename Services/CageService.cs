using Microsoft.EntityFrameworkCore;
using shelter2.DTOs;
using shelter2.Models;

namespace shelter2.Services;

public class CageService : ICageService
{
    private readonly CatDbContext _context;
    public CageService(CatDbContext context) => _context = context;

    public async Task<object> GetAllAsync()
    {
        return await _context.cages.ToListAsync();
    }

    public async Task<object> GetOverviewAsync()
    {
        var cages = await _context.cages
            .Include(c => c.cats)
                .ThenInclude(cat => cat.status)
            .Include(c => c.cats)
                .ThenInclude(cat => cat.medical_card)
                    .ThenInclude(mc => mc.medical_records)
            .OrderBy(c => c.number)
            .ToListAsync();

        var result = cages.Select(cage => {
            var activeCats = cage.cats.Where(c => c.departure_date == null).ToList();
            return new {
                cage.cage_id,
                cage.number,
                cage.capacity,
                cage.cage_type,
                current_count = activeCats.Count,
                available_spots = cage.capacity - activeCats.Count,
                cats = activeCats.Select(cat => {
                    var latestDiagnosis = cat.medical_card?.medical_records
                        .OrderByDescending(r => r.record_date)
                        .Select(r => r.diagnosis)
                        .FirstOrDefault(d => !string.IsNullOrWhiteSpace(d));
                    return new {
                        cat.cat_id,
                        cat.name,
                        cat.breed,
                        cat.color,
                        gender = cat.gender.HasValue ? cat.gender.Value.ToString() : null,
                        status_name = cat.status?.name,
                        diagnosis = latestDiagnosis
                    };
                })
            };
        }).ToList();

        return result;
    }

    public async Task MoveCatAsync(MoveCatDto dto)
    {
        var cat = await _context.cats.FindAsync(dto.cat_id)
            ?? throw new KeyNotFoundException("Кошка не найдена");

        var newCage = await _context.cages
            .Include(c => c.cats)
            .FirstOrDefaultAsync(c => c.cage_id == dto.new_cage_id)
            ?? throw new KeyNotFoundException("Клетка не найдена");

        var occupiedCount = newCage.cats.Count(c => c.departure_date == null && c.cat_id != dto.cat_id);
        if (occupiedCount >= newCage.capacity)
            throw new InvalidOperationException(
                $"Клетка №{newCage.number} заполнена (вместимость: {newCage.capacity}, занято: {occupiedCount})");

        cat.cage_id = dto.new_cage_id;
        await _context.SaveChangesAsync();
    }
}
