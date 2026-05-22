namespace shelter2.DTOs;

public class EventCreateDto
{
    public string name { get; set; } = null!;
    public DateOnly event_date { get; set; }
    public string? location { get; set; }
    public int employee_id { get; set; }
    public string? notes { get; set; }
}

public class EventCatDto
{
    public int cat_id { get; set; }
    public string? condition_after { get; set; }
}
