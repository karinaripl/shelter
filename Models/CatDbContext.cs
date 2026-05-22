using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace shelter2.Models;

public partial class CatDbContext : DbContext
{
    public CatDbContext()
    {
    }

    public CatDbContext(DbContextOptions<CatDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<_event> _events { get; set; }

    public virtual DbSet<account> accounts { get; set; }

    public virtual DbSet<benefactor> benefactors { get; set; }

    public virtual DbSet<cage> cages { get; set; }

    public virtual DbSet<cat> cats { get; set; }

    public virtual DbSet<cat_status> cat_statuses { get; set; }

    public virtual DbSet<donation> donations { get; set; }

    public virtual DbSet<employee> employees { get; set; }

    public virtual DbSet<event_participation> event_participations { get; set; }

    public virtual DbSet<medical_card> medical_cards { get; set; }

    public virtual DbSet<medical_record> medical_records { get; set; }

    public virtual DbSet<monetary_donation> monetary_donations { get; set; }

    public virtual DbSet<position> positions { get; set; }

    public virtual DbSet<procedure_consumption_rate> procedure_consumption_rates { get; set; }

    public virtual DbSet<procedure_record> procedure_records { get; set; }

    public virtual DbSet<procedure_type> procedure_types { get; set; }

    public virtual DbSet<product> products { get; set; }

    public virtual DbSet<product_batch> product_batches { get; set; }

    public virtual DbSet<product_expense> product_expenses { get; set; }

    public virtual DbSet<salary_payment> salary_payments { get; set; }

    public virtual DbSet<source_of_arrival> source_of_arrivals { get; set; }

    public virtual DbSet<supplier> suppliers { get; set; }

    public virtual DbSet<supply> supplies { get; set; }

    public virtual DbSet<volunteer> volunteers { get; set; }

    public virtual DbSet<volunteer_care> volunteer_cares { get; set; }

    public virtual DbSet<warehouse> warehouses { get; set; }

    public virtual DbSet<warehouse_remain> warehouse_remains { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see https://go.microsoft.com/fwlink/?LinkId=723263.
        => optionsBuilder.UseNpgsql("Host=localhost;Port=5432;Database=catbd;Username=postgres;Password=1313");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<_event>(entity =>
        {
            entity.HasKey(e => e.event_id).HasName("event_pkey");

            entity.ToTable("event");

            entity.Property(e => e.location).HasMaxLength(200);
            entity.Property(e => e.name).HasMaxLength(100);

            entity.HasOne(d => d.employee).WithMany(p => p._events)
                .HasForeignKey(d => d.employee_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("event_employee_id_fkey");
        });

        modelBuilder.Entity<account>(entity =>
        {
            entity.HasKey(e => e.account_id).HasName("account_pkey");

            entity.ToTable("account");

            entity.Property(e => e.amount).HasPrecision(12, 2);
            entity.Property(e => e.date).HasDefaultValueSql("CURRENT_DATE");
            entity.Property(e => e.operation_type).HasMaxLength(50);
        });

        modelBuilder.Entity<benefactor>(entity =>
        {
            entity.HasKey(e => e.benefactor_id).HasName("benefactor_pkey");

            entity.ToTable("benefactor");

            entity.Property(e => e.email).HasMaxLength(100);
            entity.Property(e => e.full_name).HasMaxLength(150);
            entity.Property(e => e.phone).HasMaxLength(20);
        });

        modelBuilder.Entity<cage>(entity =>
        {
            entity.HasKey(e => e.cage_id).HasName("cage_pkey");

            entity.ToTable("cage");

            entity.HasIndex(e => e.number, "cage_number_key").IsUnique();

            entity.Property(e => e.cage_type).HasMaxLength(50);
            entity.Property(e => e.number).HasMaxLength(10);
        });

        modelBuilder.Entity<cat>(entity =>
        {
            entity.HasKey(e => e.cat_id).HasName("cat_pkey");

            entity.ToTable("cat");

            entity.Property(e => e.breed).HasMaxLength(50);
            entity.Property(e => e.color).HasMaxLength(50);
            entity.Property(e => e.gender).HasMaxLength(1);
            entity.Property(e => e.name).HasMaxLength(100);
            entity.Property(e => e.source_of_arrival).HasMaxLength(50);

            entity.HasOne(d => d.cage).WithMany(p => p.cats)
                .HasForeignKey(d => d.cage_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("cat_cage_id_fkey");

            entity.HasOne(d => d.status).WithMany(p => p.cats)
                .HasForeignKey(d => d.status_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("cat_status_id_fkey");
        });

        modelBuilder.Entity<cat_status>(entity =>
        {
            entity.HasKey(e => e.status_id).HasName("cat_status_pkey");

            entity.ToTable("cat_status");

            entity.HasIndex(e => e.name, "cat_status_name_key").IsUnique();

            entity.Property(e => e.name).HasMaxLength(50);
        });

        modelBuilder.Entity<donation>(entity =>
        {
            entity.HasKey(e => e.source_id).HasName("donation_pkey");

            entity.ToTable("donation");

            entity.Property(e => e.source_id).ValueGeneratedNever();
            entity.Property(e => e.amount).HasPrecision(12, 2);
            entity.Property(e => e.donation_date).HasDefaultValueSql("CURRENT_DATE");
            entity.Property(e => e.donation_type).HasMaxLength(20);

            entity.HasOne(d => d.benefactor).WithMany(p => p.donations)
                .HasForeignKey(d => d.benefactor_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("donation_benefactor_id_fkey");

            entity.HasOne(d => d.source).WithOne(p => p.donation)
                .HasForeignKey<donation>(d => d.source_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("donation_source_id_fkey");
        });

        modelBuilder.Entity<employee>(entity =>
        {
            entity.HasKey(e => e.employee_id).HasName("employee_pkey");

            entity.ToTable("employee");

            entity.HasIndex(e => new { e.passport_series, e.passport_number }, "unique_passport_employee").IsUnique();

            entity.Property(e => e.email).HasMaxLength(100);
            entity.Property(e => e.full_name).HasMaxLength(150);
            entity.Property(e => e.hire_date).HasDefaultValueSql("CURRENT_DATE");
            entity.Property(e => e.login).HasMaxLength(50);
            entity.Property(e => e.passport_number).HasMaxLength(6);
            entity.Property(e => e.passport_series).HasMaxLength(4);
            entity.Property(e => e.password).HasMaxLength(255);
            entity.Property(e => e.phone).HasMaxLength(20);
            entity.Property(e => e.position_name).HasMaxLength(50);
            entity.Property(e => e.work_hours).HasDefaultValue(0);

            entity.HasOne(d => d.position_nameNavigation).WithMany(p => p.employees)
                .HasForeignKey(d => d.position_name)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("employee_position_name_fkey");
        });

        modelBuilder.Entity<event_participation>(entity =>
        {
            entity.HasKey(e => new { e.cat_id, e.event_id }).HasName("event_participation_pkey");

            entity.ToTable("event_participation");

            entity.HasOne(d => d.cat).WithMany(p => p.event_participations)
                .HasForeignKey(d => d.cat_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("event_participation_cat_id_fkey");

            entity.HasOne(d => d._event).WithMany(p => p.event_participations)
                .HasForeignKey(d => d.event_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("event_participation_event_id_fkey");
        });

        modelBuilder.Entity<medical_card>(entity =>
        {
            entity.HasKey(e => e.medical_card_id).HasName("medical_card_pkey");

            entity.ToTable("medical_card");

            entity.HasIndex(e => e.cat_id, "medical_card_cat_id_key").IsUnique();

            entity.Property(e => e.is_parasite_treated).HasDefaultValue(false);
            entity.Property(e => e.is_sterilized).HasDefaultValue(false);
            entity.Property(e => e.is_vaccinated).HasDefaultValue(false);
            entity.Property(e => e.opening_date).HasDefaultValueSql("CURRENT_DATE");
            entity.Property(e => e.weight).HasPrecision(5, 2);

            entity.HasOne(d => d.cat).WithOne(p => p.medical_card)
                .HasForeignKey<medical_card>(d => d.cat_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("medical_card_cat_id_fkey");
        });

        modelBuilder.Entity<medical_record>(entity =>
        {
            entity.HasKey(e => new { e.employee_id, e.medical_card_id, e.record_date }).HasName("medical_record_pkey");

            entity.ToTable("medical_record");

            entity.Property(e => e.record_date).HasDefaultValueSql("CURRENT_DATE");

            entity.HasOne(d => d.employee).WithMany(p => p.medical_records)
                .HasForeignKey(d => d.employee_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("medical_record_employee_id_fkey");

            entity.HasOne(d => d.medical_card).WithMany(p => p.medical_records)
                .HasForeignKey(d => d.medical_card_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("medical_record_medical_card_id_fkey");
        });

        modelBuilder.Entity<monetary_donation>(entity =>
        {
            entity.HasKey(e => new { e.source_id, e.account_id }).HasName("monetary_donation_pkey");

            entity.ToTable("monetary_donation");

            entity.Property(e => e.amount).HasPrecision(12, 2);

            entity.HasOne(d => d.account).WithMany(p => p.monetary_donations)
                .HasForeignKey(d => d.account_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("monetary_donation_account_id_fkey");

            entity.HasOne(d => d.source).WithMany(p => p.monetary_donations)
                .HasForeignKey(d => d.source_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("monetary_donation_source_id_fkey");
        });

        modelBuilder.Entity<position>(entity =>
        {
            entity.HasKey(e => e.position_name).HasName("position_pkey");

            entity.ToTable("position");

            entity.Property(e => e.position_name).HasMaxLength(50);
            entity.Property(e => e.salary).HasPrecision(10, 2);
        });

        modelBuilder.Entity<procedure_consumption_rate>(entity =>
        {
            entity.HasKey(e => new { e.procedure_type_name, e.product_id }).HasName("procedure_consumption_rate_pkey");

            entity.ToTable("procedure_consumption_rate");

            entity.Property(e => e.procedure_type_name).HasMaxLength(50);

            entity.HasOne(d => d.procedure_type_nameNavigation).WithMany(p => p.procedure_consumption_rates)
                .HasForeignKey(d => d.procedure_type_name)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("procedure_consumption_rate_procedure_type_name_fkey");

            entity.HasOne(d => d.product).WithMany(p => p.procedure_consumption_rates)
                .HasForeignKey(d => d.product_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("procedure_consumption_rate_product_id_fkey");
        });

        modelBuilder.Entity<procedure_record>(entity =>
        {
            entity.HasKey(e => new { e.employee_id, e.procedure_type_name, e.cat_id, e.procedure_date }).HasName("procedure_record_pkey");

            entity.ToTable("procedure_record");

            entity.Property(e => e.procedure_type_name).HasMaxLength(50);
            entity.Property(e => e.procedure_date).HasDefaultValueSql("CURRENT_DATE");

            entity.HasOne(d => d.cat).WithMany(p => p.procedure_records)
                .HasForeignKey(d => d.cat_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("procedure_record_cat_id_fkey");

            entity.HasOne(d => d.employee).WithMany(p => p.procedure_records)
                .HasForeignKey(d => d.employee_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("procedure_record_employee_id_fkey");

            entity.HasOne(d => d.procedure_type_nameNavigation).WithMany(p => p.procedure_records)
                .HasForeignKey(d => d.procedure_type_name)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("procedure_record_procedure_type_name_fkey");
        });

        modelBuilder.Entity<procedure_type>(entity =>
        {
            entity.HasKey(e => e.procedure_type_name).HasName("procedure_type_pkey");

            entity.ToTable("procedure_type");

            entity.Property(e => e.procedure_type_name).HasMaxLength(50);
        });

        modelBuilder.Entity<product>(entity =>
        {
            entity.HasKey(e => e.product_id).HasName("product_pkey");

            entity.ToTable("product");

            entity.Property(e => e.name).HasMaxLength(100);
            entity.Property(e => e.unit_of_measure).HasMaxLength(20);
            entity.Property(e => e.category).HasMaxLength(50);
        });

        modelBuilder.Entity<product_batch>(entity =>
        {
            entity.HasKey(e => e.batch_id).HasName("product_batch_pkey");

            entity.ToTable("product_batch");

            entity.Property(e => e.arrival_date).HasDefaultValueSql("CURRENT_DATE");
            entity.Property(e => e.purchase_price).HasPrecision(10, 2);

            entity.HasOne(d => d.employee).WithMany()
                .HasForeignKey(d => d.employee_id).IsRequired(false)
                .HasConstraintName("product_batch_employee_id_fkey");

            entity.HasOne(d => d.product).WithMany(p => p.product_batches)
                .HasForeignKey(d => d.product_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("product_batch_product_id_fkey");

            entity.HasOne(d => d.source).WithMany(p => p.product_batches)
                .HasForeignKey(d => d.source_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("product_batch_source_id_fkey");
        });

        modelBuilder.Entity<product_expense>(entity =>
        {
            entity.HasKey(e => new { e.employee_id, e.batch_id, e.cat_id, e.expense_date }).HasName("product_expense_pkey");

            entity.ToTable("product_expense");

            entity.Property(e => e.expense_date).HasDefaultValueSql("CURRENT_DATE");

            entity.HasOne(d => d.batch).WithMany(p => p.product_expenses)
                .HasForeignKey(d => d.batch_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("product_expense_batch_id_fkey");

            entity.HasOne(d => d.cat).WithMany(p => p.product_expenses)
                .HasForeignKey(d => d.cat_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("product_expense_cat_id_fkey");

            entity.HasOne(d => d.employee).WithMany(p => p.product_expenses)
                .HasForeignKey(d => d.employee_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("product_expense_employee_id_fkey");
        });

        modelBuilder.Entity<salary_payment>(entity =>
        {
            entity.HasKey(e => new { e.employee_id, e.account_id }).HasName("salary_payment_pkey");

            entity.ToTable("salary_payment");

            entity.Property(e => e.amount).HasPrecision(10, 2);
            entity.Property(e => e.payment_date).HasDefaultValueSql("CURRENT_DATE");

            entity.HasOne(d => d.account).WithMany(p => p.salary_payments)
                .HasForeignKey(d => d.account_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("salary_payment_account_id_fkey");

            entity.HasOne(d => d.employee).WithMany(p => p.salary_payments)
                .HasForeignKey(d => d.employee_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("salary_payment_employee_id_fkey");
        });

        modelBuilder.Entity<source_of_arrival>(entity =>
        {
            entity.HasKey(e => e.source_id).HasName("source_of_arrival_pkey");

            entity.ToTable("source_of_arrival");
        });

        modelBuilder.Entity<supplier>(entity =>
        {
            entity.HasKey(e => e.supplier_id).HasName("supplier_pkey");

            entity.ToTable("supplier");

            entity.Property(e => e.phone).HasMaxLength(20);
        });

        modelBuilder.Entity<supply>(entity =>
        {
            entity.HasKey(e => e.source_id).HasName("supply_pkey");

            entity.ToTable("supply");

            entity.Property(e => e.source_id).ValueGeneratedNever();
            entity.Property(e => e.delivery_date).HasDefaultValueSql("CURRENT_DATE");

            entity.HasOne(d => d.account).WithMany(p => p.supplies)
                .HasForeignKey(d => d.account_id)
                .HasConstraintName("supply_account_id_fkey");

            entity.HasOne(d => d.source).WithOne(p => p.supply)
                .HasForeignKey<supply>(d => d.source_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("supply_source_id_fkey");

            entity.HasOne(d => d.supplier).WithMany(p => p.supplies)
                .HasForeignKey(d => d.supplier_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("supply_supplier_id_fkey");
        });

        modelBuilder.Entity<volunteer>(entity =>
        {
            entity.HasKey(e => e.volunteer_id).HasName("volunteer_pkey");

            entity.ToTable("volunteer");

            entity.HasIndex(e => new { e.passport_series, e.passport_number }, "unique_passport_volunteer").IsUnique();

            entity.Property(e => e.email).HasMaxLength(100);
            entity.Property(e => e.full_name).HasMaxLength(150);
            entity.Property(e => e.passport_number).HasMaxLength(6);
            entity.Property(e => e.passport_series).HasMaxLength(4);
            entity.Property(e => e.phone).HasMaxLength(20);
            entity.Property(e => e.registration_date).HasDefaultValueSql("CURRENT_DATE");
        });

        modelBuilder.Entity<volunteer_care>(entity =>
        {
            entity.HasKey(e => new { e.volunteer_id, e.cat_id }).HasName("volunteer_care_pkey");

            entity.ToTable("volunteer_care");

            entity.HasOne(d => d.cat).WithMany(p => p.volunteer_cares)
                .HasForeignKey(d => d.cat_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("volunteer_care_cat_id_fkey");

            entity.HasOne(d => d.volunteer).WithMany(p => p.volunteer_cares)
                .HasForeignKey(d => d.volunteer_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("volunteer_care_volunteer_id_fkey");
        });

        modelBuilder.Entity<warehouse>(entity =>
        {
            entity.HasKey(e => e.warehouse_id).HasName("warehouse_pkey");

            entity.ToTable("warehouse");

            entity.Property(e => e.warehouse_type).HasMaxLength(50);
        });

        modelBuilder.Entity<warehouse_remain>(entity =>
        {
            entity.HasKey(e => new { e.batch_id, e.warehouse_id }).HasName("warehouse_remains_pkey");

            entity.HasOne(d => d.batch).WithMany(p => p.warehouse_remains)
                .HasForeignKey(d => d.batch_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("warehouse_remains_batch_id_fkey");

            entity.HasOne(d => d.warehouse).WithMany(p => p.warehouse_remains)
                .HasForeignKey(d => d.warehouse_id)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("warehouse_remains_warehouse_id_fkey");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
