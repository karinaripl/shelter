using System;
using System.Collections.Generic;

namespace shelter2.Models;

public partial class account
{
    public int account_id { get; set; }

    public DateOnly date { get; set; }

    public decimal? amount { get; set; }

    public string? operation_type { get; set; }

    public string? purpose { get; set; }

    public int? batch_id { get; set; }

    public virtual ICollection<monetary_donation> monetary_donations { get; set; } = new List<monetary_donation>();

    public virtual ICollection<salary_payment> salary_payments { get; set; } = new List<salary_payment>();

    public virtual ICollection<supply> supplies { get; set; } = new List<supply>();
}
