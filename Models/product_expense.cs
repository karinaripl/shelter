using System;
using System.Collections.Generic;

namespace shelter2.Models;

public partial class product_expense
{
    public int employee_id { get; set; }

    public int batch_id { get; set; }

    public int cat_id { get; set; }

    public DateOnly expense_date { get; set; }

    public decimal quantity { get; set; }

    public string? notes { get; set; }

    public virtual product_batch batch { get; set; } = null!;

    public virtual cat cat { get; set; } = null!;

    public virtual employee employee { get; set; } = null!;
}
