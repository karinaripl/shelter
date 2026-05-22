using shelter2.DTOs;

namespace shelter2.Services;

public interface ICageService
{
    Task<object> GetAllAsync();
    Task<object> GetOverviewAsync();
    Task MoveCatAsync(MoveCatDto dto);
}
