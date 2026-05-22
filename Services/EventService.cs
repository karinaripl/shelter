using Microsoft.EntityFrameworkCore;
using shelter2.DTOs;
using shelter2.Models;

namespace shelter2.Services;

public class EventService : IEventService
{
    private readonly CatDbContext _context;
    public EventService(CatDbContext context) => _context = context;

    public async Task<object> GetAllAsync()
    {
        var result = await _context._events
            .Include(e => e.employee)
            .Include(e => e.event_participations)
            .Select(e => new {
                e.event_id,
                e.name,
                e.event_date,
                e.location,
                e.notes,
                e.employee_id,
                employee_name = e.employee.full_name,
                cat_count = e.event_participations.Count
            })
            .OrderByDescending(e => e.event_date)
            .ToListAsync();
        return result;
    }

    public async Task<int> CreateEventAsync(EventCreateDto dto)
    {
        var ev = new _event
        {
            name = dto.name,
            event_date = dto.event_date,
            location = dto.location,
            employee_id = dto.employee_id,
            notes = dto.notes
        };
        _context._events.Add(ev);
        await _context.SaveChangesAsync();
        return ev.event_id;
    }

    public async Task UpdateEventAsync(int id, EventCreateDto dto)
    {
        var ev = await _context._events.FindAsync(id)
            ?? throw new KeyNotFoundException("Мероприятие не найдено");

        ev.name = dto.name;
        ev.event_date = dto.event_date;
        ev.location = dto.location;
        ev.employee_id = dto.employee_id;
        ev.notes = dto.notes;
        await _context.SaveChangesAsync();
    }

    public async Task DeleteEventAsync(int id)
    {
        var ev = await _context._events.FindAsync(id)
            ?? throw new KeyNotFoundException("Мероприятие не найдено");
        _context._events.Remove(ev);
        await _context.SaveChangesAsync();
    }

    public async Task<object> GetParticipationsAsync(int eventId)
    {
        var result = await _context.event_participations
            .Include(p => p.cat).ThenInclude(c => c.status)
            .Where(p => p.event_id == eventId)
            .Select(p => new {
                p.cat_id,
                cat_name = p.cat.name,
                cat_breed = p.cat.breed,
                cat_color = p.cat.color,
                cat_status = p.cat.status.name,
                p.condition_after
            })
            .ToListAsync();
        return result;
    }

    public async Task AddCatAsync(int eventId, EventCatDto dto)
    {
        var exists = await _context.event_participations
            .AnyAsync(p => p.event_id == eventId && p.cat_id == dto.cat_id);
        if (exists)
            throw new InvalidOperationException("Эта кошка уже добавлена в мероприятие");

        var ev = await _context._events.FindAsync(eventId)
            ?? throw new KeyNotFoundException("Мероприятие не найдено");

        var today = DateOnly.FromDateTime(DateTime.Today);
        if (ev.event_date != today)
            throw new InvalidOperationException(
                $"Кошек можно добавлять только в день мероприятия ({ev.event_date:dd.MM.yyyy}). Сегодня — {today:dd.MM.yyyy}.");

        var cat = await _context.cats.FindAsync(dto.cat_id)
            ?? throw new KeyNotFoundException("Кошка не найдена");
        if (cat.departure_date.HasValue && cat.departure_date.Value < ev.event_date)
            throw new InvalidOperationException(
                $"Кошка «{cat.name}» выбыла {cat.departure_date.Value:dd.MM.yyyy} — раньше даты мероприятия {ev.event_date:dd.MM.yyyy}. Добавить её нельзя.");

        var part = new event_participation
        {
            event_id = eventId,
            cat_id = dto.cat_id,
            condition_after = dto.condition_after
        };
        _context.event_participations.Add(part);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateCatConditionAsync(int eventId, int catId, EventCatDto dto)
    {
        var part = await _context.event_participations
            .FirstOrDefaultAsync(p => p.event_id == eventId && p.cat_id == catId)
            ?? throw new KeyNotFoundException("Запись не найдена");

        part.condition_after = dto.condition_after;
        await _context.SaveChangesAsync();
    }

    public async Task<object> GetAdoptionStatsAsync()
    {
        return await _context.Database
            .SqlQuery<EventAdoptionDto>(
                $"SELECT event_id, total_cats, adopted_after, adoption_rate_pct FROM v_event_adoption_rate")
            .ToListAsync();
    }

    public async Task RemoveCatAsync(int eventId, int catId)
    {
        var part = await _context.event_participations
            .FirstOrDefaultAsync(p => p.event_id == eventId && p.cat_id == catId)
            ?? throw new KeyNotFoundException("Запись не найдена");

        _context.event_participations.Remove(part);
        await _context.SaveChangesAsync();
    }
}
