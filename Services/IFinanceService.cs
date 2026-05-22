using shelter2.DTOs;

namespace shelter2.Services;

public interface IFinanceService
{
    Task<object> GetSummaryAsync();
    Task<object> GetSupplyExpensesAsync();
    Task<object> GetDonationsAsync();
    Task<object> CreateDonationAsync(DonationCreateDto dto);
    Task DeleteDonationAsync(int sourceId);
    Task<object> GetSalariesAsync();
    Task<object> GetSalaryPreviewAsync(int year, int month);
    Task<object> PaySalariesAsync(PaySalariesDto dto);
    Task<object> GetBenefactorsAsync();
    Task<object> GetProductsAsync();
}
