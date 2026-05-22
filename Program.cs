using Microsoft.EntityFrameworkCore;
using shelter2.Models;
using shelter2.Services;

namespace shelter2
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // ��������� �������� ���� ������
            builder.Services.AddDbContext<CatDbContext>(options =>
                options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
                       .EnableSensitiveDataLogging() // �������� ��� �������
                       .LogTo(Console.WriteLine, LogLevel.Information));

            // CORS
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowAll", policy =>
                {
                    policy.AllowAnyOrigin()
                          .AllowAnyMethod()
                          .AllowAnyHeader();
                });
            });

            // Swagger
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();

            // ��������� �����������
            builder.Services.AddControllers();

            // ������������ ������ �����������
            builder.Services.AddScoped<IAuthService, AuthService>();
            builder.Services.AddScoped<ICatService, CatService>();
            builder.Services.AddScoped<ICageService, CageService>();
            builder.Services.AddScoped<ICatStatusService, CatStatusService>();
            builder.Services.AddScoped<IEmployeeService, EmployeeService>();
            builder.Services.AddScoped<IEventService, EventService>();
            builder.Services.AddScoped<IFinanceService, FinanceService>();
            builder.Services.AddScoped<IMedicalCardService, MedicalCardService>();
            builder.Services.AddScoped<IPositionService, PositionService>();
            builder.Services.AddScoped<IProcedureService, ProcedureService>();
            builder.Services.AddScoped<IStatsService, StatsService>();
            builder.Services.AddScoped<IVolunteerService, VolunteerService>();
            builder.Services.AddScoped<IWarehouseService, WarehouseService>();

            var app = builder.Build();

            // Автоматическое добавление новых столбцов в БД (без миграций)
            using (var scope = app.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<CatDbContext>();
                db.Database.ExecuteSqlRaw(
                    "ALTER TABLE product ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'Корм';"
                );
                db.Database.ExecuteSqlRaw(
                    "ALTER TABLE product_batch ADD COLUMN IF NOT EXISTS employee_id INTEGER REFERENCES employee(employee_id);"
                );
                db.Database.ExecuteSqlRaw(
                    "ALTER TABLE account ADD COLUMN IF NOT EXISTS batch_id INTEGER REFERENCES product_batch(batch_id) ON DELETE SET NULL;"
                );
                db.Database.ExecuteSqlRaw(
                    "ALTER TABLE product ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;"
                );
                db.Database.ExecuteSqlRaw(
                    "UPDATE product SET category = 'Корм' WHERE category IS NULL;"
                );
                try { db.Database.ExecuteSqlRaw("ALTER TABLE product_expense ALTER COLUMN quantity TYPE NUMERIC(10,3);"); } catch { }
                try { db.Database.ExecuteSqlRaw("ALTER TABLE warehouse_remains ALTER COLUMN quantity TYPE NUMERIC(10,3);"); } catch { }
                try { db.Database.ExecuteSqlRaw("ALTER TABLE product_batch ALTER COLUMN quantity TYPE NUMERIC(10,3);"); } catch { }
                db.Database.ExecuteSqlRaw(
                    "ALTER TABLE \"event\" ADD COLUMN IF NOT EXISTS notes TEXT;"
                );
            }

            // Глобальный JSON-обработчик ошибок (вместо HTML exception page)
            app.UseExceptionHandler(errApp => errApp.Run(async ctx =>
            {
                ctx.Response.ContentType = "application/json";
                ctx.Response.StatusCode  = 500;
                await ctx.Response.WriteAsJsonAsync(new { error = "Ошибка сервера. Попробуйте позже." });
            }));

            // Swagger UI
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            app.UseCors("AllowAll");
            app.UseDefaultFiles();
            app.UseStaticFiles();
            app.UseHttpsRedirection();

            app.MapControllers();

            // �������� ��������
            app.MapGet("/api/test", () => Results.Ok(new { message = "API ��������!", port = 7099 }));

            app.Run();
        }
    }
}
