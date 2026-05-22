using shelter2.DTOs;

namespace shelter2.Services;

public interface IEventService
{
    Task<object> GetAllAsync();
    Task<int> CreateEventAsync(EventCreateDto dto);
    Task UpdateEventAsync(int id, EventCreateDto dto);
    Task DeleteEventAsync(int id);
    Task<object> GetParticipationsAsync(int eventId);
    Task AddCatAsync(int eventId, EventCatDto dto);
    Task UpdateCatConditionAsync(int eventId, int catId, EventCatDto dto);
    Task RemoveCatAsync(int eventId, int catId);
    Task<object> GetAdoptionStatsAsync();
}
