namespace shelter2.DTOs
{
    public class ConsumptionRateDto
    {
        public int product_id { get; set; }
        public int standard_quantity { get; set; }
        public string? notes { get; set; }
    }

    public class ProcedureTypeCreateDto
    {
        public string procedure_type_name { get; set; } = null!;
        public string? description { get; set; }
        public List<ConsumptionRateDto>? consumption_rates { get; set; }
    }

    public class ProcedureRecordCreateDto
    {
        public int employee_id { get; set; }
        public string procedure_type_name { get; set; } = null!;
        public int cat_id { get; set; }
        public DateOnly procedure_date { get; set; }
        public string? result { get; set; }
        public string? notes { get; set; }
    }
}
