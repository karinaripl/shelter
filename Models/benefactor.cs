using System;
using System.Collections.Generic;

namespace shelter2.Models;

public partial class benefactor
{
    public int benefactor_id { get; set; }

    public string full_name { get; set; } = null!;

    public string? phone { get; set; }

    public string? email { get; set; }

    public virtual ICollection<donation> donations { get; set; } = new List<donation>();
}
