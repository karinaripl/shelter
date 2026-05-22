using System;
using System.Collections.Generic;

namespace shelter2.Models;

public partial class _event
{
    public int event_id { get; set; }

    public int employee_id { get; set; }

    public string name { get; set; } = null!;

    public DateOnly event_date { get; set; }

    public string? location { get; set; }

    public string? notes { get; set; }

    public virtual employee employee { get; set; } = null!;

    public virtual ICollection<event_participation> event_participations { get; set; } = new List<event_participation>();
}
