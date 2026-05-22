using System;
using System.Collections.Generic;

namespace shelter2.Models;

public partial class product
{
    public int product_id { get; set; }

    public string name { get; set; } = null!;

    public string? unit_of_measure { get; set; }

    public string? category { get; set; }

    public bool is_active { get; set; } = true;

    public virtual ICollection<procedure_consumption_rate> procedure_consumption_rates { get; set; } = new List<procedure_consumption_rate>();

    public virtual ICollection<product_batch> product_batches { get; set; } = new List<product_batch>();
}
