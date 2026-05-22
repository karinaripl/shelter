namespace shelter2.DTOs
{
    public class EmployeeCreateDto
    {
        public string full_name { get; set; } = string.Empty;
        public string position_name { get; set; } = string.Empty;
        public string? phone { get; set; }
        public string? email { get; set; }
        public string? address { get; set; }
        public string? passport_series { get; set; }
        public string? passport_number { get; set; }
        public DateOnly? birth_date { get; set; }
        public DateOnly hire_date { get; set; }
        public DateOnly? termination_date { get; set; }
        public int? work_hours { get; set; }
        public string? login { get; set; }
        public string? password { get; set; }
    }

    public class EmployeeUpdateDto
    {
        public int employee_id { get; set; }
        public string full_name { get; set; } = string.Empty;
        public string position_name { get; set; } = string.Empty;
        public string? phone { get; set; }
        public string? email { get; set; }
        public string? address { get; set; }
        public string? passport_series { get; set; }
        public string? passport_number { get; set; }
        public DateOnly? birth_date { get; set; }
        public DateOnly hire_date { get; set; }
        public DateOnly? termination_date { get; set; }
        public int? work_hours { get; set; }
        public string? login { get; set; }
        public string? password { get; set; }
    }
}