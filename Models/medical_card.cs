using System;
using System.Collections.Generic;

namespace shelter2.Models;

public partial class medical_card
{
    public int medical_card_id { get; set; }

    public int cat_id { get; set; }

    public DateOnly opening_date { get; set; }

    public decimal? weight { get; set; }

    public bool? is_sterilized { get; set; }

    public bool? is_vaccinated { get; set; }

    public bool? is_parasite_treated { get; set; }

    public virtual cat cat { get; set; } = null!;

    public virtual ICollection<medical_record> medical_records { get; set; } = new List<medical_record>();
}
