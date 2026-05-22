using System;
using System.Collections.Generic;

namespace shelter2.Models;

public partial class employee
{
    public int employee_id { get; set; }

    public string position_name { get; set; } = null!;

    public string full_name { get; set; } = null!;

    public string? phone { get; set; }

    public string? address { get; set; }

    public string? email { get; set; }

    public DateOnly? birth_date { get; set; }

    public DateOnly hire_date { get; set; }

    public DateOnly? termination_date { get; set; }

    public int? work_hours { get; set; }

    public string? passport_series { get; set; }

    public string? passport_number { get; set; }

    public string? login { get; set; }

    public string? password { get; set; }

    public virtual ICollection<_event> _events { get; set; } = new List<_event>();

    public virtual ICollection<medical_record> medical_records { get; set; } = new List<medical_record>();

    public virtual position position_nameNavigation { get; set; } = null!;

    public virtual ICollection<procedure_record> procedure_records { get; set; } = new List<procedure_record>();

    public virtual ICollection<product_expense> product_expenses { get; set; } = new List<product_expense>();

    public virtual ICollection<salary_payment> salary_payments { get; set; } = new List<salary_payment>();
}
