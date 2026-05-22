using shelter2.DTOs;

namespace shelter2.Services;

public interface IMedicalCardService
{
    Task<object> GetAllAsync();
    Task<object?> GetByCatAsync(int catId);
    Task<int> CreateAsync(MedicalCardCreateDto dto);
    Task UpdateAsync(int id, MedicalCardUpdateDto dto);
    Task<object> GetRecordsAsync(int cardId);
    Task CreateRecordAsync(MedicalRecordCreateDto dto);
    Task DeleteRecordAsync(int employeeId, int medicalCardId, DateOnly date);
}
