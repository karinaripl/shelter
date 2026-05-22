using System;
using System.Collections.Generic;

namespace shelter2.Models;

public partial class warehouse_remain
{
    public int batch_id { get; set; }

    public int warehouse_id { get; set; }

    public decimal quantity { get; set; }

    public virtual product_batch batch { get; set; } = null!;

    public virtual warehouse warehouse { get; set; } = null!;
}
