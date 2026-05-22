namespace shelter2.DTOs
{
    public class VolunteerCreateDto
    {
        public string full_name { get; set; } = null!;
        public string? phone { get; set; }
        public string? email { get; set; }
        public string? address { get; set; }
        public string? passport_series { get; set; }
        public string? passport_number { get; set; }
        public DateOnly? birth_date { get; set; }
        public DateOnly registration_date { get; set; }
        public string? skills { get; set; }
    }

    public class VolunteerUpdateDto : VolunteerCreateDto
    {
        public int volunteer_id { get; set; }
    }

    public class VolunteerCareCreateDto
    {
        public int volunteer_id { get; set; }
        public int cat_id { get; set; }
        public DateOnly start_date { get; set; }
        public DateOnly? end_date { get; set; }
    }
}
