using Microsoft.EntityFrameworkCore;
using shelter2.Models;

namespace shelter2.Services;

public class PositionService : IPositionService
{
    private readonly CatDbContext _context;
    public PositionService(CatDbContext context) => _context = context;

    public async Task<List<position>> GetAllAsync()
    {
        return await _context.positions.ToListAsync();
    }
}
