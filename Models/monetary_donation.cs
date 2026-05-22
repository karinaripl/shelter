using System;
using System.Collections.Generic;

namespace shelter2.Models;

public partial class monetary_donation
{
    public int source_id { get; set; }

    public int account_id { get; set; }

    public decimal amount { get; set; }

    public virtual account account { get; set; } = null!;

    public virtual donation source { get; set; } = null!;
}
