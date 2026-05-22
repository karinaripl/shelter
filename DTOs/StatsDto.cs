namespace shelter2.DTOs
{
    public class StatsDto
    {
        public int CatsInShelter { get; set; }      // Котов в приюте
        public int FreeCages { get; set; }          // Свободных клеток
        public decimal FoodConsumption { get; set; } // Расход корма в кг
        public decimal MonthlyIncome { get; set; }   // Поступлений в ₽
        public int WeeklyProcedures { get; set; }    // Процедур за неделю
        public int ActiveVolunteers { get; set; }    // Активных волонтёров
        public int TotalCats { get; set; }           // Всего кошек
        public int TotalVolunteers { get; set; }     // Всего волонтёров
    }
}