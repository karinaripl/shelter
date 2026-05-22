using System;
using System.Collections.Generic;

namespace shelter2.Models;

public partial class supplier
{
    public int supplier_id { get; set; }

    public string? phone { get; set; }

    public string? address { get; set; }

    public virtual ICollection<supply> supplies { get; set; } = new List<supply>();
}
