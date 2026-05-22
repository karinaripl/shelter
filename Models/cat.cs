using System;
using System.Collections.Generic;

namespace shelter2.Models;

public partial class cat
{
    public int cat_id { get; set; }

    public int status_id { get; set; }

    public int cage_id { get; set; }

    public string source_of_arrival { get; set; } = null!;

    public DateOnly? departure_date { get; set; }

    public string? name { get; set; }

    public char? gender { get; set; }

    public DateOnly? birth_date { get; set; }

    public string? color { get; set; }

    public string? breed { get; set; }

    public string? character { get; set; }

    public string? special_marks { get; set; }

    public virtual cage cage { get; set; } = null!;

    public virtual ICollection<event_participation> event_participations { get; set; } = new List<event_participation>();

    public virtual medical_card? medical_card { get; set; }

    public virtual ICollection<procedure_record> procedure_records { get; set; } = new List<procedure_record>();

    public virtual ICollection<product_expense> product_expenses { get; set; } = new List<product_expense>();

    public virtual cat_status status { get; set; } = null!;

    public virtual ICollection<volunteer_care> volunteer_cares { get; set; } = new List<volunteer_care>();
}
