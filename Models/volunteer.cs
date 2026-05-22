using System;
using System.Collections.Generic;

namespace shelter2.Models;

public partial class volunteer
{
    public int volunteer_id { get; set; }

    public string full_name { get; set; } = null!;

    public string? phone { get; set; }

    public string? address { get; set; }

    public string? passport_series { get; set; }

    public string? passport_number { get; set; }

    public string? email { get; set; }

    public DateOnly? birth_date { get; set; }

    public DateOnly registration_date { get; set; }

    public string? skills { get; set; }

    public virtual ICollection<volunteer_care> volunteer_cares { get; set; } = new List<volunteer_care>();
}
