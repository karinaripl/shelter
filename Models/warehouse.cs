using System;
using System.Collections.Generic;

namespace shelter2.Models;

public partial class warehouse
{
    public int warehouse_id { get; set; }

    public string? warehouse_type { get; set; }

    public int? capacity { get; set; }

    public virtual ICollection<warehouse_remain> warehouse_remains { get; set; } = new List<warehouse_remain>();
}
