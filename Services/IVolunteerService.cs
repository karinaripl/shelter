using shelter2.DTOs;
using shelter2.Models;

namespace shelter2.Services;

public interface IVolunteerService
{
    Task<List<volunteer>> GetAllAsync();
    Task<volunteer?> GetByIdAsync(int id);
    Task<int> CreateAsync(VolunteerCreateDto dto);
    Task UpdateAsync(int id, VolunteerUpdateDto dto);
    Task DeleteAsync(int id);
    Task<object> GetCaresAsync();
    Task CreateCareAsync(VolunteerCareCreateDto dto);
    Task UpdateCareAsync(int volunteerId, int catId, VolunteerCareCreateDto dto);
    Task DeleteCareAsync(int volunteerId, int catId);
}
