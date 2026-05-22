using Microsoft.EntityFrameworkCore;
using shelter2.DTOs;
using shelter2.Models;

namespace shelter2.Services;

public class VolunteerService : IVolunteerService
{
    private readonly CatDbContext _context;
    public VolunteerService(CatDbContext context) => _context = context;

    public async Task<List<volunteer>> GetAllAsync()
    {
        return await _context.volunteers.ToListAsync();
    }

    public async Task<volunteer?> GetByIdAsync(int id)
    {
        return await _context.volunteers.FindAsync(id);
    }

    public async Task<int> CreateAsync(VolunteerCreateDto dto)
    {
        var v = new volunteer
        {
            full_name = dto.full_name, phone = dto.phone, email = dto.email,
            address = dto.address, passport_series = dto.passport_series,
            passport_number = dto.passport_number, birth_date = dto.birth_date,
            registration_date = dto.registration_date, skills = dto.skills
        };
        _context.volunteers.Add(v);
        await _context.SaveChangesAsync();
        return v.volunteer_id;
    }

    public async Task UpdateAsync(int id, VolunteerUpdateDto dto)
    {
        var v = await _context.volunteers.FindAsync(id)
            ?? throw new KeyNotFoundException("Волонтёр не найден");

        v.full_name = dto.full_name; v.phone = dto.phone; v.email = dto.email;
        v.address = dto.address; v.passport_series = dto.passport_series;
        v.passport_number = dto.passport_number; v.birth_date = dto.birth_date;
        v.registration_date = dto.registration_date; v.skills = dto.skills;
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(int id)
    {
        var v = await _context.volunteers.FindAsync(id)
            ?? throw new KeyNotFoundException("Волонтёр не найден");
        _context.volunteers.Remove(v);
        await _context.SaveChangesAsync();
    }

    public async Task<object> GetCaresAsync()
    {
        var result = await _context.volunteer_cares
            .Include(vc => vc.volunteer)
            .Include(vc => vc.cat)
            .Select(vc => new {
                vc.volunteer_id,
                volunteer_name = vc.volunteer.full_name,
                vc.cat_id,
                cat_name = vc.cat.name,
                cat_breed = vc.cat.breed,
                cat_color = vc.cat.color,
                vc.start_date,
                vc.end_date
            }).ToListAsync();
        return result;
    }

    public async Task CreateCareAsync(VolunteerCareCreateDto dto)
    {
        var exists = await _context.volunteer_cares
            .AnyAsync(vc => vc.volunteer_id == dto.volunteer_id && vc.cat_id == dto.cat_id);
        if (exists)
            throw new InvalidOperationException("Этот волонтёр уже закреплён за этой кошкой");

        var care = new volunteer_care
        {
            volunteer_id = dto.volunteer_id,
            cat_id = dto.cat_id,
            start_date = dto.start_date,
            end_date = dto.end_date
        };
        _context.volunteer_cares.Add(care);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateCareAsync(int volunteerId, int catId, VolunteerCareCreateDto dto)
    {
        var care = await _context.volunteer_cares.FindAsync(volunteerId, catId)
            ?? throw new KeyNotFoundException("Запись о закреплении не найдена");

        care.start_date = dto.start_date;
        care.end_date = dto.end_date;
        await _context.SaveChangesAsync();
    }

    public async Task DeleteCareAsync(int volunteerId, int catId)
    {
        var care = await _context.volunteer_cares.FindAsync(volunteerId, catId)
            ?? throw new KeyNotFoundException("Запись о закреплении не найдена");
        _context.volunteer_cares.Remove(care);
        await _context.SaveChangesAsync();
    }
}
