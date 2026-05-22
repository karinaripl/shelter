using System;
using System.Collections.Generic;

namespace shelter2.Models;

public partial class event_participation
{
    public int cat_id { get; set; }

    public int event_id { get; set; }

    public string? condition_after { get; set; }

    public virtual _event _event { get; set; } = null!;

    public virtual cat cat { get; set; } = null!;
}
