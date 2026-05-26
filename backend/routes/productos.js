const express = require('express');
const router = express.Router();
const db = require('../db');
const sql = db.sql;

router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT * FROM (
        SELECT C_cuenta AS id_producto, C_cliente AS id_cliente, C_tipo_producto AS tipo_producto,
               C_moneda AS moneda, F_apertura AS fecha_apertura, UPPER(D_estado) AS estado,
               CONCAT('Cuenta ', D_numero_cuenta, ' - ', ISNULL(tp.D_descripcion,'')) AS descripcion
        FROM dbo.Cuenta c
        LEFT JOIN dbo.cat_TipoProducto tp ON tp.N_tipo_producto = c.C_tipo_producto

        UNION ALL
        SELECT C_credito, C_cliente, C_tipo_producto, C_moneda, F_formalizacion, UPPER(D_estado),
               CONCAT('Crédito ', D_num_operacion, ' - ', ISNULL(tp.D_descripcion,''))
        FROM dbo.Credito cr
        LEFT JOIN dbo.cat_TipoProducto tp ON tp.N_tipo_producto = cr.C_tipo_producto

        UNION ALL
        SELECT C_tarjeta, C_cliente, 8, C_moneda, F_emision, UPPER(D_estado),
               CONCAT('Tarjeta ', D_num_tarjeta)
        FROM dbo.TarjetaCredito

        UNION ALL
        SELECT C_deposito, C_cliente, 2, C_moneda, F_emision, UPPER(D_estado),
               CONCAT('Depósito a plazo ', D_numero_cert)
        FROM dbo.DepositoPlazo
      ) p
      ORDER BY id_cliente, tipo_producto, id_producto;
    `);
    res.json({ data: result.recordset, total: result.recordset.length });
  } catch (err) { next(err); }
});

router.get('/cliente/:idCliente', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT * FROM (
        SELECT C_cuenta AS id_producto, C_cliente AS id_cliente, C_tipo_producto AS tipo_producto,
               C_moneda AS moneda, F_apertura AS fecha_apertura, UPPER(D_estado) AS estado,
               CONCAT('Cuenta ', D_numero_cuenta) AS descripcion
        FROM dbo.Cuenta
        UNION ALL
        SELECT C_credito, C_cliente, C_tipo_producto, C_moneda, F_formalizacion, UPPER(D_estado),
               CONCAT('Crédito ', D_num_operacion)
        FROM dbo.Credito
        UNION ALL
        SELECT C_tarjeta, C_cliente, 8, C_moneda, F_emision, UPPER(D_estado),
               CONCAT('Tarjeta ', D_num_tarjeta)
        FROM dbo.TarjetaCredito
        UNION ALL
        SELECT C_deposito, C_cliente, 2, C_moneda, F_emision, UPPER(D_estado),
               CONCAT('Depósito a plazo ', D_numero_cert)
        FROM dbo.DepositoPlazo
      ) p
      WHERE id_cliente = @id
      ORDER BY tipo_producto, id_producto;
    `, [{ name: 'id', type: sql.Int, value: parseInt(req.params.idCliente) }]);
    res.json({ data: result.recordset, total: result.recordset.length });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT TOP 1 * FROM (
        SELECT C_cuenta AS id_producto, C_cliente AS id_cliente, C_tipo_producto AS tipo_producto,
               C_moneda AS moneda, F_apertura AS fecha_apertura, UPPER(D_estado) AS estado,
               CONCAT('Cuenta ', D_numero_cuenta) AS descripcion
        FROM dbo.Cuenta
        UNION ALL
        SELECT C_credito, C_cliente, C_tipo_producto, C_moneda, F_formalizacion, UPPER(D_estado),
               CONCAT('Crédito ', D_num_operacion)
        FROM dbo.Credito
        UNION ALL
        SELECT C_tarjeta, C_cliente, 8, C_moneda, F_emision, UPPER(D_estado),
               CONCAT('Tarjeta ', D_num_tarjeta)
        FROM dbo.TarjetaCredito
      ) p WHERE id_producto = @id;
    `, [{ name: 'id', type: sql.Int, value: parseInt(req.params.id) }]);
    if (!result.recordset.length) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ data: result.recordset[0] });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const idCliente = parseInt(req.body.id_cliente);
    const tipo = parseInt(req.body.tipo_producto);
    const moneda = parseInt(req.body.moneda || 1);
    const fecha = req.body.fecha_apertura || new Date().toISOString().slice(0, 10);
    const estado = req.body.estado || 'Activo';

    if (!idCliente || !tipo) return res.status(400).json({ error: 'id_cliente y tipo_producto son requeridos' });

    let result;
    if ([1, 3, 4].includes(tipo)) {
      result = await db.query(`
        DECLARE @id INT = ISNULL((SELECT MAX(C_cuenta) FROM dbo.Cuenta), 0) + 1;
        INSERT INTO dbo.Cuenta (C_cuenta, C_cliente, C_tipo_producto, D_numero_cuenta, C_moneda, F_apertura, D_estado)
        OUTPUT INSERTED.C_cuenta AS id_producto, INSERTED.C_cliente AS id_cliente, INSERTED.C_tipo_producto AS tipo_producto,
               INSERTED.C_moneda AS moneda, INSERTED.F_apertura AS fecha_apertura, UPPER(INSERTED.D_estado) AS estado,
               INSERTED.D_numero_cuenta AS descripcion
        VALUES (@id, @cliente, @tipo, CONCAT('CR', FORMAT(@id, '0000000000')), @moneda, @fecha, @estado);
      `, [
        { name: 'cliente', type: sql.Int, value: idCliente },
        { name: 'tipo', type: sql.TinyInt, value: tipo },
        { name: 'moneda', type: sql.TinyInt, value: moneda },
        { name: 'fecha', type: sql.Date, value: fecha },
        { name: 'estado', type: sql.NVarChar(20), value: estado }
      ]);
    } else if ([6, 7, 9, 10].includes(tipo)) {
      result = await db.query(`
        DECLARE @id INT = ISNULL((SELECT MAX(C_credito) FROM dbo.Credito), 0) + 1;
        INSERT INTO dbo.Credito (C_credito, C_cliente, C_tipo_producto, D_num_operacion, C_moneda,
          M_monto_aprobado, M_saldo_principal, M_tasa_interes, Q_plazo_meses, F_formalizacion, F_vencimiento, D_estado)
        OUTPUT INSERTED.C_credito AS id_producto, INSERTED.C_cliente AS id_cliente, INSERTED.C_tipo_producto AS tipo_producto,
               INSERTED.C_moneda AS moneda, INSERTED.F_formalizacion AS fecha_apertura, UPPER(INSERTED.D_estado) AS estado,
               INSERTED.D_num_operacion AS descripcion
        VALUES (@id, @cliente, @tipo, CONCAT('CRD', FORMAT(@id, '000000')), @moneda,
          1000000, 1000000, 0.1800, 60, @fecha, DATEADD(MONTH, 60, @fecha), @estado);
      `, [
        { name: 'cliente', type: sql.Int, value: idCliente },
        { name: 'tipo', type: sql.TinyInt, value: tipo },
        { name: 'moneda', type: sql.TinyInt, value: moneda },
        { name: 'fecha', type: sql.Date, value: fecha },
        { name: 'estado', type: sql.NVarChar(20), value: estado }
      ]);
    } else if (tipo === 8) {
      result = await db.query(`
        DECLARE @id INT = ISNULL((SELECT MAX(C_tarjeta) FROM dbo.TarjetaCredito), 0) + 1;
        INSERT INTO dbo.TarjetaCredito (C_tarjeta, C_cliente, D_num_tarjeta, C_moneda, M_limite_credito,
          M_saldo_utilizado, M_saldo_disponible, M_tasa_interes, F_emision, F_vencimiento, N_dia_corte, N_dia_pago, D_estado)
        OUTPUT INSERTED.C_tarjeta AS id_producto, INSERTED.C_cliente AS id_cliente, 8 AS tipo_producto,
               INSERTED.C_moneda AS moneda, INSERTED.F_emision AS fecha_apertura, UPPER(INSERTED.D_estado) AS estado,
               INSERTED.D_num_tarjeta AS descripcion
        VALUES (@id, @cliente, CONCAT('411111111111', FORMAT(@id, '0000')), @moneda, 500000,
          0, 500000, 0.3200, @fecha, DATEADD(YEAR, 4, @fecha), 15, 30, @estado);
      `, [
        { name: 'cliente', type: sql.Int, value: idCliente },
        { name: 'moneda', type: sql.TinyInt, value: moneda },
        { name: 'fecha', type: sql.Date, value: fecha },
        { name: 'estado', type: sql.NVarChar(20), value: estado }
      ]);
    } else {
      return res.status(400).json({ error: 'Creación no implementada para ese tipo_producto. Usa 1/3/4 cuenta, 6/7/9/10 crédito, 8 tarjeta.' });
    }

    res.status(201).json({ data: result.recordset[0], message: 'Producto creado' });
  } catch (err) { next(err); }
});

router.put('/:id', (req, res) => res.status(501).json({ error: 'Actualización de producto genérico no implementada; edita Cuentas/Préstamos/Tarjetas.' }));
router.delete('/:id', (req, res) => res.status(501).json({ error: 'Eliminación de producto genérico no implementada; elimina desde Cuentas/Préstamos/Tarjetas.' }));

module.exports = router;
