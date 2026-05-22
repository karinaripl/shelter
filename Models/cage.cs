using System;
using System.Collections.Generic;

namespace shelter2.Models;

public partial class cage
{
    public int cage_id { get; set; }

    public string number { get; set; } = null!;

    public int capacity { get; set; }

    public string? cage_type { get; set; }

    public virtual ICollection<cat> cats { get; set; } = new List<cat>();
}
