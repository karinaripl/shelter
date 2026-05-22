using System;
using System.Collections.Generic;

namespace shelter2.Models;

public partial class procedure_type
{
    public string procedure_type_name { get; set; } = null!;

    public string? description { get; set; }

    public virtual ICollection<procedure_consumption_rate> procedure_consumption_rates { get; set; } = new List<procedure_consumption_rate>();

    public virtual ICollection<procedure_record> procedure_records { get; set; } = new List<procedure_record>();
}
