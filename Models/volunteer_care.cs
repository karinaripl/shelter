using System;
using System.Collections.Generic;

namespace shelter2.Models;

public partial class volunteer_care
{
    public int volunteer_id { get; set; }

    public int cat_id { get; set; }

    public DateOnly start_date { get; set; }

    public DateOnly? end_date { get; set; }

    public virtual cat cat { get; set; } = null!;

    public virtual volunteer volunteer { get; set; } = null!;
}
