using Microsoft.EntityFrameworkCore;
using shelter2.DTOs;
using shelter2.Models;

namespace shelter2.Services;

public class WarehouseService : IWarehouseService
{
    private readonly CatDbContext _context;
    public WarehouseService(CatDbContext context) => _context = context;

    public async Task<object> GetWarehousesAsync()
    {
        return await _context.warehouses.ToListAsync();
    }

    public async Task<object> GetProductsAsync()
    {
        return await _context.products
            .Select(p => new { p.product_id, p.name, p.unit_of_measure, p.category, p.is_active })
            .ToListAsync();
    }

    public async Task SetProductActiveAsync(int id, bool isActive)
    {
        var p = await _context.products.FindAsync(id)
            ?? throw new KeyNotFoundException("Продукт не найден");
        p.is_active = isActive;
        await _context.SaveChangesAsync();
    }

    public async Task<int> CreateProductAsync(ProductCreateDto dto)
    {
        var p = new product { name = dto.name, unit_of_measure = dto.unit_of_measure, category = dto.category ?? "Корм" };
        _context.products.Add(p);
        await _context.SaveChangesAsync();
        return p.product_id;
    }

    public async Task UpdateProductAsync(int id, ProductUpdateDto dto)
    {
        var p = await _context.products.FindAsync(id)
            ?? throw new KeyNotFoundException("Продукт не найден");

        p.name = dto.name; p.unit_of_measure = dto.unit_of_measure; p.category = dto.category ?? p.category;
        await _context.SaveChangesAsync();
    }

    public async Task DeleteProductAsync(int id)
    {
        var p = await _context.products.FindAsync(id)
            ?? throw new KeyNotFoundException("Продукт не найден");
        _context.products.Remove(p);
        await _context.SaveChangesAsync();
    }

    public async Task<object> GetBatchesAsync()
    {
        var result = await _context.product_batches
            .Include(b => b.product)
            .Include(b => b.employee)
            .Select(b => new {
                b.batch_id,
                b.product_id,
                product_name = b.product.name,
                unit = b.product.unit_of_measure,
                category = b.product.category,
                b.arrival_date,
                b.expiration_date,
                b.quantity,
                b.purchase_price,
                b.source_id,
                b.employee_id,
                employee_name = b.employee != null ? b.employee.full_name : null,
                has_expenses = b.product_expenses.Any(),
                product_is_active = b.product.is_active
            }).OrderByDescending(b => b.arrival_date).ToListAsync();
        return result;
    }

    public async Task<int> CreateBatchAsync(ProductBatchCreateDto dto)
    {
        var totalCost = (dto.purchase_price ?? 0) * dto.quantity;

        if (totalCost > 0)
        {
            var balance = (await _context.Database
                .SqlQuery<decimal>($"SELECT balance FROM v_finance_balance")
                .ToListAsync()).FirstOrDefault();

            if (totalCost > balance)
                throw new InvalidOperationException(
                    $"Недостаточно средств. Доступный баланс: {balance:N2} ₽, стоимость партии: {totalCost:N2} ₽");
        }

        var source = new source_of_arrival();
        _context.source_of_arrivals.Add(source);
        await _context.SaveChangesAsync();

        var batch = new product_batch
        {
            product_id      = dto.product_id,
            employee_id     = dto.employee_id,
            source_id       = source.source_id,
            arrival_date    = dto.arrival_date,
            expiration_date = dto.expiration_date,
            quantity        = dto.quantity,
            purchase_price  = dto.purchase_price
        };
        _context.product_batches.Add(batch);
        await _context.SaveChangesAsync();

        var remain = new warehouse_remain
        {
            batch_id     = batch.batch_id,
            warehouse_id = dto.warehouse_id,
            quantity     = dto.quantity
        };
        _context.warehouse_remains.Add(remain);

        if (totalCost > 0)
        {
            var product = await _context.products.FindAsync(dto.product_id);
            _context.accounts.Add(new account {
                date           = dto.arrival_date,
                amount         = totalCost,
                operation_type = "Закупка",
                purpose        = $"Закупка: {product?.name} — {dto.quantity} {product?.unit_of_measure}",
                batch_id       = batch.batch_id
            });
        }

        await _context.SaveChangesAsync();
        return batch.batch_id;
    }

    public async Task<object> GetRemainsAsync()
    {
        var result = await _context.warehouse_remains
            .Include(r => r.batch).ThenInclude(b => b.product)
            .Include(r => r.warehouse)
            .Select(r => new {
                r.batch_id,
                product_name = r.batch.product.name,
                unit = r.batch.product.unit_of_measure,
                expiration_date = r.batch.expiration_date,
                r.warehouse_id,
                warehouse_type = r.warehouse.warehouse_type,
                r.quantity
            }).ToListAsync();
        return result;
    }

    public async Task<object> GetExpensesAsync()
    {
        var result = await _context.product_expenses
            .Include(e => e.batch).ThenInclude(b => b.product)
            .Include(e => e.cat)
            .Include(e => e.employee)
            .Select(e => new {
                e.employee_id,
                employee_name = e.employee.full_name,
                e.batch_id,
                product_name = e.batch.product.name,
                unit = e.batch.product.unit_of_measure,
                e.cat_id,
                cat_name = e.cat.name,
                cat_breed = e.cat.breed,
                cat_color = e.cat.color,
                e.expense_date,
                e.quantity,
                e.notes
            }).OrderByDescending(e => e.expense_date).ToListAsync();
        return result;
    }

    public async Task CreateExpenseAsync(ProductExpenseCreateDto dto)
    {
        var batchForCheck = await _context.product_batches.FindAsync(dto.batch_id);
        if (batchForCheck?.expiration_date != null && batchForCheck.expiration_date < DateOnly.FromDateTime(DateTime.Today))
            throw new InvalidOperationException($"Срок годности партии #{dto.batch_id} истёк — её нельзя использовать. Спишите партию со склада.");

        var exist = await _context.product_expenses.AnyAsync(e =>
            e.employee_id == dto.employee_id && e.batch_id == dto.batch_id &&
            e.cat_id == dto.cat_id && e.expense_date == dto.expense_date);
        if (exist)
            throw new InvalidOperationException("Такая запись расхода уже существует");

        var expense = new product_expense
        {
            employee_id = dto.employee_id, batch_id = dto.batch_id,
            cat_id = dto.cat_id, expense_date = dto.expense_date,
            quantity = dto.quantity, notes = dto.notes
        };
        _context.product_expenses.Add(expense);

        var remain = await _context.warehouse_remains
            .FirstOrDefaultAsync(r => r.batch_id == dto.batch_id);
        if (remain != null)
            remain.quantity -= dto.quantity;

        await _context.SaveChangesAsync();
    }

    public async Task DeleteBatchAsync(int batchId)
    {
        var batch = await _context.product_batches
            .Include(b => b.product_expenses)
            .Include(b => b.warehouse_remains)
            .FirstOrDefaultAsync(b => b.batch_id == batchId)
            ?? throw new KeyNotFoundException("Партия не найдена");

        if (batch.product_expenses.Any())
            throw new InvalidOperationException("Нельзя удалить партию — по ней уже есть записи расхода");

        var sourceId = batch.source_id;

        var batchAccount = await _context.accounts
            .FirstOrDefaultAsync(a => a.batch_id == batchId);
        if (batchAccount != null)
            _context.accounts.Remove(batchAccount);

        _context.warehouse_remains.RemoveRange(batch.warehouse_remains);
        _context.product_batches.Remove(batch);
        await _context.SaveChangesAsync();

        var source = await _context.source_of_arrivals
            .Include(s => s.donation)
            .Include(s => s.supply)
            .FirstOrDefaultAsync(s => s.source_id == sourceId);
        if (source != null && source.donation == null && source.supply == null)
        {
            _context.source_of_arrivals.Remove(source);
            await _context.SaveChangesAsync();
        }
    }

    public async Task WriteOffBatchAsync(int batchId)
    {
        var remains = await _context.warehouse_remains
            .Where(r => r.batch_id == batchId)
            .ToListAsync();
        if (!remains.Any())
            throw new KeyNotFoundException("Партия не найдена или уже списана");
        foreach (var r in remains)
            r.quantity = 0;
        await _context.SaveChangesAsync();
    }

    public async Task<object> GetExpiringAsync()
    {
        return await _context.Database
            .SqlQuery<ExpiringBatchDto>(
                $"SELECT batch_id, product_name, unit_of_measure, category, expiration_date, days_left, remaining_quantity, warehouse_type FROM v_expiring_batches")
            .ToListAsync();
    }

    public async Task DeleteExpenseAsync(int employeeId, int batchId, int catId, DateOnly date)
    {
        var exp = await _context.product_expenses.FindAsync(employeeId, batchId, catId, date)
            ?? throw new KeyNotFoundException("Запись расхода не найдена");

        var remain = await _context.warehouse_remains
            .FirstOrDefaultAsync(r => r.batch_id == batchId);
        if (remain != null)
            remain.quantity += exp.quantity;

        _context.product_expenses.Remove(exp);
        await _context.SaveChangesAsync();
    }
}
