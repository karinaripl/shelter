using Microsoft.EntityFrameworkCore;
using shelter2.DTOs;
using shelter2.Models;

namespace shelter2.Services;

public class FinanceService : IFinanceService
{
    private readonly CatDbContext _context;
    public FinanceService(CatDbContext context) => _context = context;

    public async Task<object> GetSummaryAsync()
    {
        var totalIncome   = await _context.monetary_donations.SumAsync(m => (decimal?)m.amount) ?? 0;
        var totalSalaries = await _context.salary_payments.SumAsync(s => (decimal?)s.amount) ?? 0;
        var totalSupply   = await _context.accounts
            .Where(a => a.operation_type == "Закупка")
            .SumAsync(a => (decimal?)a.amount) ?? 0;
        var donationsCount   = await _context.donations.CountAsync();
        var benefactorsCount = await _context.benefactors.CountAsync();

        return new {
            total_income          = totalIncome,
            total_salaries        = totalSalaries,
            total_supply_expenses = totalSupply,
            balance               = totalIncome - totalSalaries - totalSupply,
            donations_count       = donationsCount,
            benefactors_count     = benefactorsCount
        };
    }

    public async Task<object> GetSupplyExpensesAsync()
    {
        var list = await _context.accounts
            .Where(a => a.operation_type == "Закупка")
            .OrderByDescending(a => a.date)
            .Select(a => new {
                a.account_id,
                a.date,
                a.amount,
                a.purpose
            })
            .ToListAsync();
        return list;
    }

    public async Task<object> GetDonationsAsync()
    {
        var totalIncome   = await _context.monetary_donations.SumAsync(m => (decimal?)m.amount) ?? 0;
        var totalSalaries = await _context.salary_payments.SumAsync(s => (decimal?)s.amount) ?? 0;
        var totalSupply   = await _context.accounts
            .Where(a => a.operation_type == "Закупка")
            .SumAsync(a => (decimal?)a.amount) ?? 0;
        var currentBalance = totalIncome - totalSalaries - totalSupply;

        var consumedSourceIds = await _context.product_batches
            .Where(pb => pb.product_expenses.Any())
            .Select(pb => pb.source_id)
            .Distinct()
            .ToListAsync();

        var list = await _context.donations
            .Include(d => d.benefactor)
            .Include(d => d.monetary_donations)
            .Include(d => d.source)
                .ThenInclude(s => s.product_batches)
                    .ThenInclude(pb => pb.product)
            .OrderByDescending(d => d.donation_date)
            .ToListAsync();

        return list.Select(d => {
            var donAmount = d.monetary_donations.FirstOrDefault()?.amount ?? 0;
            bool canDelete = d.donation_type == "денежное"
                ? (currentBalance - donAmount) >= 0
                : !consumedSourceIds.Contains(d.source_id);

            return new {
                source_id        = d.source_id,
                benefactor_id    = d.benefactor_id,
                benefactor_name  = d.benefactor.full_name,
                benefactor_phone = d.benefactor.phone,
                donation_date    = d.donation_date,
                donation_type    = d.donation_type,
                amount           = d.monetary_donations.FirstOrDefault()?.amount,
                products         = d.source.product_batches.Select(pb => new {
                    product_name = pb.product.name,
                    quantity     = pb.quantity,
                    unit         = pb.product.unit_of_measure
                }).ToList(),
                can_delete = canDelete
            };
        }).ToList<object>();
    }

    public async Task<object> CreateDonationAsync(DonationCreateDto dto)
    {
        if (dto.benefactor_id == null && string.IsNullOrWhiteSpace(dto.benefactor_name))
            throw new InvalidOperationException("Укажите жертвователя или его имя");

        var type = dto.donation_type?.Trim().ToLowerInvariant();
        if (type != "денежное" && type != "натуральное")
            throw new InvalidOperationException("Недопустимый тип пожертвования");

        if (type == "денежное")
        {
            if (dto.amount == null || dto.amount <= 0)
                throw new InvalidOperationException("Для денежного пожертвования укажите сумму больше нуля");
        }
        else
        {
            if (dto.products == null || !dto.products.Any())
                throw new InvalidOperationException("Для натурального пожертвования добавьте хотя бы один товар");
            if (dto.products.Any(p => p.product_id <= 0 || p.quantity <= 0))
                throw new InvalidOperationException("Проверьте данные товаров: выберите товар и укажите количество больше нуля");
        }

        int benefactorId;
        if (dto.benefactor_id.HasValue)
        {
            benefactorId = dto.benefactor_id.Value;
        }
        else
        {
            var b = new benefactor {
                full_name = dto.benefactor_name!.Trim(),
                phone     = dto.phone?.Trim(),
                email     = dto.email?.Trim()
            };
            _context.benefactors.Add(b);
            await _context.SaveChangesAsync();
            benefactorId = b.benefactor_id;
        }

        var src = new source_of_arrival();
        _context.source_of_arrivals.Add(src);
        await _context.SaveChangesAsync();

        var donDate = dto.donation_date == default
                      ? DateOnly.FromDateTime(DateTime.Today) : dto.donation_date;

        var don = new donation {
            source_id     = src.source_id,
            benefactor_id = benefactorId,
            donation_date = donDate,
            amount        = null,
            donation_type = type
        };
        _context.donations.Add(don);
        await _context.SaveChangesAsync();

        object? responseProducts = null;

        if (type == "денежное")
        {
            var ben = await _context.benefactors.FindAsync(benefactorId);
            var acc = new account {
                date           = donDate,
                amount         = dto.amount,
                operation_type = "Приход",
                purpose        = $"Пожертвование от {ben!.full_name}"
            };
            _context.accounts.Add(acc);
            await _context.SaveChangesAsync();

            _context.monetary_donations.Add(new monetary_donation {
                source_id  = don.source_id,
                account_id = acc.account_id,
                amount     = dto.amount!.Value
            });
            await _context.SaveChangesAsync();
        }
        else
        {
            const int charityWarehouseId = 4;

            foreach (var item in dto.products!)
            {
                var batch = new product_batch {
                    product_id     = item.product_id,
                    source_id      = src.source_id,
                    arrival_date   = donDate,
                    quantity       = item.quantity,
                    purchase_price = null
                };
                _context.product_batches.Add(batch);
                await _context.SaveChangesAsync();

                _context.warehouse_remains.Add(new warehouse_remain {
                    batch_id     = batch.batch_id,
                    warehouse_id = charityWarehouseId,
                    quantity     = item.quantity
                });
            }
            await _context.SaveChangesAsync();

            responseProducts = await _context.product_batches
                .Where(pb => pb.source_id == src.source_id)
                .Include(pb => pb.product)
                .Select(pb => new {
                    product_name = pb.product.name,
                    pb.quantity,
                    unit = pb.product.unit_of_measure
                })
                .ToListAsync();
        }

        var benefactor = await _context.benefactors.FindAsync(benefactorId);
        return new {
            source_id        = don.source_id,
            benefactor_id    = benefactorId,
            benefactor_name  = benefactor!.full_name,
            benefactor_phone = benefactor.phone,
            donation_date    = don.donation_date,
            donation_type    = don.donation_type,
            amount           = type == "денежное" ? dto.amount : (decimal?)null,
            products         = responseProducts
        };
    }

    public async Task DeleteDonationAsync(int sourceId)
    {
        var don = await _context.donations
            .Include(d => d.monetary_donations)
                .ThenInclude(md => md.account)
            .FirstOrDefaultAsync(d => d.source_id == sourceId)
            ?? throw new KeyNotFoundException(string.Empty);

        if (don.donation_type == "натуральное")
        {
            var batches = await _context.product_batches
                .Include(pb => pb.warehouse_remains)
                .Include(pb => pb.product_expenses)
                .Where(pb => pb.source_id == sourceId)
                .ToListAsync();

            if (batches.Any(pb => pb.product_expenses.Any()))
                throw new InvalidOperationException("Нельзя удалить — часть товаров из этого пожертвования уже израсходована");

            foreach (var batch in batches)
            {
                _context.warehouse_remains.RemoveRange(batch.warehouse_remains);
                _context.product_batches.Remove(batch);
            }
        }

        var accountsToDelete = don.monetary_donations
            .Where(md => md.account != null)
            .Select(md => md.account!)
            .ToList();

        _context.monetary_donations.RemoveRange(don.monetary_donations);
        await _context.SaveChangesAsync();

        _context.accounts.RemoveRange(accountsToDelete);
        _context.donations.Remove(don);
        var hasRemainingBatches = await _context.product_batches
            .AnyAsync(pb => pb.source_id == sourceId);
        if (!hasRemainingBatches)
        {
            var src = await _context.source_of_arrivals.FindAsync(sourceId);
            if (src != null) _context.source_of_arrivals.Remove(src);
        }

        await _context.SaveChangesAsync();
    }

    public async Task<object> GetSalariesAsync()
    {
        var list = await _context.salary_payments
            .Include(s => s.employee)
            .OrderByDescending(s => s.payment_date)
            .Select(s => new {
                employee_id   = s.employee_id,
                account_id    = s.account_id,
                employee_name = s.employee.full_name,
                position_name = s.employee.position_name,
                amount        = s.amount,
                payment_date  = s.payment_date
            })
            .ToListAsync();
        return list;
    }

    public async Task<object> GetSalaryPreviewAsync(int year, int month)
    {
        if (year < 2000 || year > 2100 || month < 1 || month > 12)
            throw new InvalidOperationException("Неверный год или месяц");

        var activeEmps = await _context.employees
            .Include(e => e.position_nameNavigation)
            .Where(e => e.termination_date == null)
            .ToListAsync();

        var paidIds = await _context.salary_payments
            .Where(s => s.payment_date.Year == year && s.payment_date.Month == month)
            .Select(s => s.employee_id)
            .Distinct()
            .ToListAsync();

        var preview = activeEmps.Select(e => {
            var rate       = e.position_nameNavigation?.salary ?? 0;
            var hours      = e.work_hours ?? 0;
            var calculated = rate * (hours / 40m);
            return new {
                employee_id   = e.employee_id,
                full_name     = e.full_name,
                position_name = e.position_name,
                salary_rate   = rate,
                work_hours    = hours,
                calculated    = calculated,
                already_paid  = paidIds.Contains(e.employee_id)
            };
        }).ToList();

        return new {
            year,
            month,
            total_to_pay = preview.Where(p => !p.already_paid).Sum(p => p.calculated),
            employees    = preview
        };
    }

    public async Task<object> PaySalariesAsync(PaySalariesDto dto)
    {
        if (dto.year < 2000 || dto.year > 2100 || dto.month < 1 || dto.month > 12)
            throw new InvalidOperationException("Неверный год или месяц");

        var activeEmps = await _context.employees
            .Include(e => e.position_nameNavigation)
            .Where(e => e.termination_date == null)
            .ToListAsync();

        var paidIds = await _context.salary_payments
            .Where(s => s.payment_date.Year == dto.year && s.payment_date.Month == dto.month)
            .Select(s => s.employee_id)
            .Distinct()
            .ToListAsync();

        var unpaid = activeEmps.Where(e => !paidIds.Contains(e.employee_id)).ToList();
        if (!unpaid.Any())
            return new { message = "Все сотрудники уже получили зарплату за этот месяц", paid = 0 };

        var payDate = new DateOnly(dto.year, dto.month,
                        DateTime.DaysInMonth(dto.year, dto.month));

        int count = 0;
        foreach (var emp in unpaid)
        {
            var rate   = emp.position_nameNavigation?.salary ?? 0;
            var hours  = emp.work_hours ?? 0;
            var amount = rate * (hours / 40m);
            if (amount <= 0) continue;

            var acc = new account {
                date           = payDate,
                amount         = amount,
                operation_type = "Расход",
                purpose        = $"Зарплата {emp.full_name} за {dto.month:D2}.{dto.year}"
            };
            _context.accounts.Add(acc);
            await _context.SaveChangesAsync();

            _context.salary_payments.Add(new salary_payment {
                employee_id  = emp.employee_id,
                account_id   = acc.account_id,
                amount       = amount,
                payment_date = payDate
            });
            count++;
        }

        await _context.SaveChangesAsync();
        return new { message = $"Зарплата начислена {count} сотруд.", paid = count };
    }

    public async Task<object> GetBenefactorsAsync()
    {
        var list = await _context.benefactors
            .Select(b => new {
                benefactor_id   = b.benefactor_id,
                full_name       = b.full_name,
                phone           = b.phone,
                email           = b.email,
                donations_count = b.donations.Count(),
                total_donated   = b.donations
                    .SelectMany(d => d.monetary_donations)
                    .Sum(m => (decimal?)m.amount) ?? 0
            })
            .OrderByDescending(b => b.total_donated)
            .ToListAsync();
        return list;
    }

    public async Task<object> GetProductsAsync()
    {
        var list = await _context.products
            .Where(p => p.is_active)
            .OrderBy(p => p.name)
            .Select(p => new { p.product_id, p.name, p.unit_of_measure })
            .ToListAsync();
        return list;
    }
}
