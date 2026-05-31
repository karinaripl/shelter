using System.ComponentModel.DataAnnotations;

namespace shelter2.DTOs
{
    public class MedicalCardCreateDto
    {
        public int cat_id { get; set; }
        public DateOnly opening_date { get; set; }
        [Range(0.01, double.MaxValue, ErrorMessage = "Вес должен быть больше 0")]
        public decimal? weight { get; set; }
        public bool? is_sterilized { get; set; }
        public bool? is_vaccinated { get; set; }
        public bool? is_parasite_treated { get; set; }
    }

    public class MedicalCardUpdateDto
    {
        public int medical_card_id { get; set; }
        [Range(0.01, double.MaxValue, ErrorMessage = "Вес должен быть больше 0")]
        public decimal? weight { get; set; }
        public bool? is_sterilized { get; set; }
        public bool? is_vaccinated { get; set; }
        public bool? is_parasite_treated { get; set; }
    }

    public class MedicalRecordCreateDto
    {
        public int employee_id { get; set; }
        public int medical_card_id { get; set; }
        public DateOnly record_date { get; set; }
        public string? diagnosis { get; set; }
        public string? prescriptions { get; set; }
        public string? notes { get; set; }
    }
}
