using shelter2.Models;

namespace shelter2.Services;

public interface IPositionService
{
    Task<List<position>> GetAllAsync();
}
