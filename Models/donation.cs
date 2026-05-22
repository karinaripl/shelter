using System;
using System.Collections.Generic;

namespace shelter2.Models;

public partial class donation
{
    public int source_id { get; set; }

    public int benefactor_id { get; set; }

    public DateOnly donation_date { get; set; }

    public decimal? amount { get; set; }

    public string? donation_type { get; set; }

    public virtual benefactor benefactor { get; set; } = null!;

    public virtual ICollection<monetary_donation> monetary_donations { get; set; } = new List<monetary_donation>();

    public virtual source_of_arrival source { get; set; } = null!;
}
