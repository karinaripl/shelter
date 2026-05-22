using System;
using System.Collections.Generic;

namespace shelter2.Models;

public partial class position
{
    public string position_name { get; set; } = null!;

    public decimal? salary { get; set; }

    public virtual ICollection<employee> employees { get; set; } = new List<employee>();
}
