namespace shelter2.DTOs
{
    public class CatCreateDto
    {
        public string? name { get; set; }
        public string? breed { get; set; }
        public string? color { get; set; }
        public string? gender { get; set; }
        public DateOnly? birth_date { get; set; }
        public DateOnly? departure_date { get; set; }
        public string source_of_arrival { get; set; } = "";
        public string? character { get; set; }
        public string? special_marks { get; set; }
        public int status_id { get; set; }
        public int? cage_id { get; set; }
    }

    public class CatUpdateDto : CatCreateDto
    {
        public int cat_id { get; set; }
    }

    public class MoveCatDto
    {
        public int cat_id { get; set; }
        public int new_cage_id { get; set; }
    }
}
