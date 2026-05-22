using System;
using System.Collections.Generic;

namespace shelter2.Models;

public partial class source_of_arrival
{
    public int source_id { get; set; }

    public virtual donation? donation { get; set; }

    public virtual ICollection<product_batch> product_batches { get; set; } = new List<product_batch>();

    public virtual supply? supply { get; set; }
}
