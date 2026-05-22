using System;
using System.Collections.Generic;

namespace shelter2.Models;

public partial class salary_payment
{
    public int employee_id { get; set; }

    public int account_id { get; set; }

    public decimal amount { get; set; }

    public DateOnly payment_date { get; set; }

    public virtual account account { get; set; } = null!;

    public virtual employee employee { get; set; } = null!;
}
