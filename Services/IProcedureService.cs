using shelter2.DTOs;

namespace shelter2.Services;

public interface IProcedureService
{
    Task<object> GetTypesAsync();
    Task CreateTypeAsync(ProcedureTypeCreateDto dto);
    Task UpdateTypeAsync(string name, ProcedureTypeCreateDto dto);
    Task DeleteTypeAsync(string name);
    Task<object> GetRecordsAsync();
    Task CreateRecordAsync(ProcedureRecordCreateDto dto);
    Task DeleteRecordAsync(int employeeId, string typeName, int catId, DateOnly date);
}
