using System;
using System.Collections.Generic;

namespace shelter2.Models;

public partial class procedure_record
{
    public int employee_id { get; set; }

    public string procedure_type_name { get; set; } = null!;

    public int cat_id { get; set; }

    public DateOnly procedure_date { get; set; }

    public string? result { get; set; }

    public string? notes { get; set; }

    public virtual cat cat { get; set; } = null!;

    public virtual employee employee { get; set; } = null!;

    public virtual procedure_type procedure_type_nameNavigation { get; set; } = null!;
}
