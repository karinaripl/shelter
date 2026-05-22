using System;
using System.Collections.Generic;

namespace shelter2.Models;

public partial class supply
{
    public int source_id { get; set; }

    public int supplier_id { get; set; }

    public int? account_id { get; set; }

    public DateOnly delivery_date { get; set; }

    public virtual account? account { get; set; }

    public virtual source_of_arrival source { get; set; } = null!;

    public virtual supplier supplier { get; set; } = null!;
}
