using shelter2.DTOs;

namespace shelter2.Services;

public interface IWarehouseService
{
    Task<object> GetWarehousesAsync();
    Task<object> GetProductsAsync();
    Task<int> CreateProductAsync(ProductCreateDto dto);
    Task UpdateProductAsync(int id, ProductUpdateDto dto);
    Task DeleteProductAsync(int id);
    Task SetProductActiveAsync(int id, bool isActive);
    Task<object> GetBatchesAsync();
    Task<int> CreateBatchAsync(ProductBatchCreateDto dto);
    Task DeleteBatchAsync(int batchId);
    Task WriteOffBatchAsync(int batchId);
    Task<object> GetRemainsAsync();
    Task<object> GetExpiringAsync();
    Task<object> GetExpensesAsync();
    Task CreateExpenseAsync(ProductExpenseCreateDto dto);
    Task DeleteExpenseAsync(int employeeId, int batchId, int catId, DateOnly date);
}
