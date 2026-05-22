using System;
using System.Collections.Generic;

namespace shelter2.Models;

public partial class product_batch
{
    public int batch_id { get; set; }

    public int product_id { get; set; }

    public int source_id { get; set; }

    public int? employee_id { get; set; }

    public DateOnly arrival_date { get; set; }

    public DateOnly? expiration_date { get; set; }

    public decimal quantity { get; set; }

    public decimal? purchase_price { get; set; }

    public virtual employee? employee { get; set; }

    public virtual product product { get; set; } = null!;

    public virtual ICollection<product_expense> product_expenses { get; set; } = new List<product_expense>();

    public virtual source_of_arrival source { get; set; } = null!;

    public virtual ICollection<warehouse_remain> warehouse_remains { get; set; } = new List<warehouse_remain>();
}
