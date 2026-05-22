namespace shelter2.DTOs
{
    public class ExpiringBatchDto
    {
        public int batch_id { get; set; }
        public string product_name { get; set; } = null!;
        public string? unit_of_measure { get; set; }
        public string? category { get; set; }
        public DateOnly expiration_date { get; set; }
        public int days_left { get; set; }
        public decimal remaining_quantity { get; set; }
        public string? warehouse_type { get; set; }
    }

    public class EventAdoptionDto
    {
        public int event_id { get; set; }
        public int total_cats { get; set; }
        public int adopted_after { get; set; }
        public decimal adoption_rate_pct { get; set; }
    }


    public class ProductCreateDto
    {
        public string name { get; set; } = null!;
        public string? unit_of_measure { get; set; }
        public string? category { get; set; }
    }

    public class ProductUpdateDto : ProductCreateDto
    {
        public int product_id { get; set; }
    }

    public class ProductBatchCreateDto
    {
        public int product_id { get; set; }
        public int? employee_id { get; set; }
        public DateOnly arrival_date { get; set; }
        public DateOnly? expiration_date { get; set; }
        public decimal quantity { get; set; }
        public decimal? purchase_price { get; set; }
        public int warehouse_id { get; set; }
    }

    public class ProductExpenseCreateDto
    {
        public int employee_id { get; set; }
        public int batch_id { get; set; }
        public int cat_id { get; set; }
        public DateOnly expense_date { get; set; }
        public decimal quantity { get; set; }
        public string? notes { get; set; }
    }
}
