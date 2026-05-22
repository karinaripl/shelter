using shelter2.DTOs;

namespace shelter2.Services;

public interface ICatService
{
    Task<object> GetAllAsync();
    Task<object?> GetByIdAsync(int id);
    Task<int> CreateAsync(CatCreateDto dto);
    Task UpdateAsync(int id, CatUpdateDto dto);
    Task DeleteAsync(int id);
}
