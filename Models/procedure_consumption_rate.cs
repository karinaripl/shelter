using System;
using System.Collections.Generic;

namespace shelter2.Models;

public partial class procedure_consumption_rate
{
    public string procedure_type_name { get; set; } = null!;

    public int product_id { get; set; }

    public int standard_quantity { get; set; }

    public string? notes { get; set; }

    public virtual procedure_type procedure_type_nameNavigation { get; set; } = null!;

    public virtual product product { get; set; } = null!;
}
