SELECT
    d.source_id,
    d.donation_date,
    d.donation_type,
    d.amount AS donation_amount_old,

    -- Жертвователь
    b.benefactor_id,
    b.full_name     AS benefactor_name,
    b.phone         AS benefactor_phone,

    -- Денежное: monetary_donation + account
    md.amount       AS money_amount,
    a.account_id,
    a.operation_type,
    a.purpose,

    -- Натуральное: партия товара
    pb.batch_id,
    p.name          AS product_name,
    pb.quantity     AS batch_quantity,
    p.unit_of_measure,
    pb.arrival_date,

    -- Остатки на складе
    wr.warehouse_id,
    w.warehouse_type,
    wr.quantity     AS remains_quantity

FROM donation d
JOIN source_of_arrival  sa  ON sa.source_id   = d.source_id
JOIN benefactor          b  ON b.benefactor_id = d.benefactor_id

-- Денежные (может не быть)
LEFT JOIN monetary_donation md ON md.source_id  = d.source_id
LEFT JOIN account            a  ON a.account_id  = md.account_id

-- Натуральные (может не быть)
LEFT JOIN product_batch pb ON pb.source_id   = sa.source_id
LEFT JOIN product        p  ON p.product_id   = pb.product_id
LEFT JOIN warehouse_remains wr ON wr.batch_id  = pb.batch_id
LEFT JOIN warehouse        w  ON w.warehouse_id = wr.warehouse_id

ORDER BY d.donation_date DESC, d.source_id, pb.batch_id;
