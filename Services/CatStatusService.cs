using Microsoft.EntityFrameworkCore;
using shelter2.Models;

namespace shelter2.Services;

public class CatStatusService : ICatStatusService
{
    private readonly CatDbContext _context;
    public CatStatusService(CatDbContext context) => _context = context;

    public async Task<object> GetAllAsync()
    {
        return await _context.cat_statuses.ToListAsync();
    }
}
