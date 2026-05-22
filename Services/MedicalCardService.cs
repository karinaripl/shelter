using Microsoft.EntityFrameworkCore;
using shelter2.DTOs;
using shelter2.Models;

namespace shelter2.Services;

public class MedicalCardService : IMedicalCardService
{
    private readonly CatDbContext _context;
    public MedicalCardService(CatDbContext context) => _context = context;

    public async Task<object> GetAllAsync()
    {
        var result = await _context.medical_cards
            .Include(mc => mc.cat)
            .Select(mc => new {
                mc.medical_card_id, mc.cat_id,
                cat_name = mc.cat.name,
                cat_breed = mc.cat.breed,
                cat_color = mc.cat.color,
                mc.opening_date, mc.weight,
                mc.is_vaccinated, mc.is_sterilized, mc.is_parasite_treated
            }).ToListAsync();
        return result;
    }

    public async Task<object?> GetByCatAsync(int catId)
    {
        var card = await _context.medical_cards
            .Include(mc => mc.cat)
            .Where(mc => mc.cat_id == catId)
            .Select(mc => new {
                mc.medical_card_id, mc.cat_id,
                cat_name = mc.cat.name,
                cat_breed = mc.cat.breed,
                cat_color = mc.cat.color,
                mc.opening_date, mc.weight,
                mc.is_vaccinated, mc.is_sterilized, mc.is_parasite_treated
            }).FirstOrDefaultAsync();
        return card;
    }

    public async Task<int> CreateAsync(MedicalCardCreateDto dto)
    {
        var exists = await _context.medical_cards.AnyAsync(mc => mc.cat_id == dto.cat_id);
        if (exists)
            throw new InvalidOperationException("Медкарта для этой кошки уже существует");

        var card = new medical_card
        {
            cat_id = dto.cat_id, opening_date = dto.opening_date,
            weight = dto.weight, is_sterilized = dto.is_sterilized,
            is_vaccinated = dto.is_vaccinated, is_parasite_treated = dto.is_parasite_treated
        };
        _context.medical_cards.Add(card);
        await _context.SaveChangesAsync();
        return card.medical_card_id;
    }

    public async Task UpdateAsync(int id, MedicalCardUpdateDto dto)
    {
        var card = await _context.medical_cards.FindAsync(id)
            ?? throw new KeyNotFoundException("Медкарта не найдена");

        card.weight = dto.weight;
        card.is_sterilized = dto.is_sterilized;
        card.is_vaccinated = dto.is_vaccinated;
        card.is_parasite_treated = dto.is_parasite_treated;
        await _context.SaveChangesAsync();
    }

    public async Task<object> GetRecordsAsync(int cardId)
    {
        var result = await _context.medical_records
            .Include(r => r.employee)
            .Where(r => r.medical_card_id == cardId)
            .Select(r => new {
                r.employee_id,
                employee_name = r.employee.full_name,
                r.medical_card_id,
                r.record_date,
                r.diagnosis,
                r.prescriptions,
                r.notes
            }).OrderByDescending(r => r.record_date).ToListAsync();
        return result;
    }

    public async Task CreateRecordAsync(MedicalRecordCreateDto dto)
    {
        var exists = await _context.medical_records.AnyAsync(r =>
            r.employee_id == dto.employee_id &&
            r.medical_card_id == dto.medical_card_id &&
            r.record_date == dto.record_date);
        if (exists)
            throw new InvalidOperationException("Запись за эту дату уже существует");

        var record = new medical_record
        {
            employee_id     = dto.employee_id,
            medical_card_id = dto.medical_card_id,
            record_date     = dto.record_date,
            diagnosis       = dto.diagnosis,
            prescriptions   = dto.prescriptions,
            notes           = dto.notes
        };
        _context.medical_records.Add(record);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteRecordAsync(int employeeId, int medicalCardId, DateOnly date)
    {
        var record = await _context.medical_records.FindAsync(employeeId, medicalCardId, date)
            ?? throw new KeyNotFoundException("Запись медкарты не найдена");
        _context.medical_records.Remove(record);
        await _context.SaveChangesAsync();
    }
}
