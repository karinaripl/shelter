namespace shelter2.DTOs;

public class DonationProductItem
{
    public int     product_id { get; set; }
    public decimal quantity   { get; set; }
}

public class DonationCreateDto
{
    public int?    benefactor_id   { get; set; }
    public string? benefactor_name { get; set; }
    public string? phone           { get; set; }
    public string? email           { get; set; }
    public DateOnly donation_date  { get; set; }
    public decimal? amount         { get; set; }
    public string?  donation_type  { get; set; }
    public List<DonationProductItem>? products { get; set; }
}

public class PaySalariesDto
{
    public int year  { get; set; }
    public int month { get; set; }
}
