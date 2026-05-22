using Microsoft.EntityFrameworkCore;
using shelter2.DTOs;
using shelter2.Models;

namespace shelter2.Services;

public class StatsService : IStatsService
{
    private readonly CatDbContext _context;
    public StatsService(CatDbContext context) => _context = context;

    public async Task<StatsDto> GetStatsAsync()
    {
        var stats = new StatsDto();

        stats.CatsInShelter = await _context.cats.CountAsync(c => c.departure_date == null);
        stats.TotalCats = await _context.cats.CountAsync();

        var totalCages = await _context.cages.CountAsync();
        var occupiedCages = await _context.cats
            .Where(c => c.cage_id != null && c.departure_date == null)
            .Select(c => c.cage_id)
            .Distinct()
            .CountAsync();
        stats.FreeCages = totalCages - occupiedCages;

        var oneMonthAgo = DateOnly.FromDateTime(DateTime.Now.AddMonths(-1));
        stats.FoodConsumption = await _context.product_expenses
            .Where(pe => pe.expense_date >= oneMonthAgo)
            .SumAsync(pe => (decimal)pe.quantity);

        stats.MonthlyIncome = await _context.donations
            .Where(d => d.donation_date >= oneMonthAgo)
            .SumAsync(d => d.amount ?? 0);

        var oneWeekAgo = DateOnly.FromDateTime(DateTime.Now.AddDays(-7));
        stats.WeeklyProcedures = await _context.procedure_records
            .CountAsync(pr => pr.procedure_date >= oneWeekAgo);

        var activeVolunteerCares = await _context.volunteer_cares
            .Where(vc => vc.end_date == null)
            .Select(vc => vc.volunteer_id)
            .Distinct()
            .ToListAsync();
        stats.ActiveVolunteers = activeVolunteerCares.Count;

        stats.TotalVolunteers = await _context.volunteers.CountAsync();

        Console.WriteLine($"=== СТАТИСТИКА ===");
        Console.WriteLine($"Кошек в приюте: {stats.CatsInShelter}");
        Console.WriteLine($"Свободных клеток: {stats.FreeCages}");
        Console.WriteLine($"Расход корма за месяц: {stats.FoodConsumption} кг");
        Console.WriteLine($"Поступления за месяц: {stats.MonthlyIncome} ₽");
        Console.WriteLine($"Процедур за неделю: {stats.WeeklyProcedures}");
        Console.WriteLine($"Активных волонтёров: {stats.ActiveVolunteers}");
        Console.WriteLine($"Всего волонтёров: {stats.TotalVolunteers}");
        Console.WriteLine($"================");

        return stats;
    }
}
