using System;
using System.Collections.Generic;

namespace shelter2.Models;

public partial class cat_status
{
    public int status_id { get; set; }

    public string name { get; set; } = null!;

    public virtual ICollection<cat> cats { get; set; } = new List<cat>();
}
