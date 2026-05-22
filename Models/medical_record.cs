using System;
using System.Collections.Generic;

namespace shelter2.Models;

public partial class medical_record
{
    public int employee_id { get; set; }

    public int medical_card_id { get; set; }

    public DateOnly record_date { get; set; }

    public string? diagnosis { get; set; }

    public string? prescriptions { get; set; }

    public string? notes { get; set; }

    public virtual employee employee { get; set; } = null!;

    public virtual medical_card medical_card { get; set; } = null!;
}
