using shelter2.DTOs;

namespace shelter2.Services;

public interface IStatsService
{
    Task<StatsDto> GetStatsAsync();
}
