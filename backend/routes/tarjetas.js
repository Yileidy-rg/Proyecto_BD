const express = require('express');
const router = express.Router();
const db = require('../db');
const sql = db.sql;

router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT C_tarjeta AS id_tarjeta, 8 AS id_producto, 8 AS tipo_tarjeta,
             D_num_tarjeta AS numero_tarjeta, M_limite_credito AS limite_credito,
             M_saldo_utilizado AS saldo_actual, D_estado AS estado
      FROM dbo.TarjetaCredito
      ORDER BY C_tarjeta;
    `);
    res.json({ data: result.recordset, total: result.recordset.length });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT C_tarjeta AS id_tarjeta, 8 AS id_producto, 8 AS tipo_tarjeta,
             D_num_tarjeta AS numero_tarjeta, M_limite_credito AS limite_credito,
             M_saldo_utilizado AS saldo_actual, D_estado AS estado
      FROM dbo.TarjetaCredito WHERE C_tarjeta = @id;
    `, [{ name: 'id', type: sql.Int, value: parseInt(req.params.id) }]);
    if (!result.recordset.length) return res.status(404).json({ error: 'Tarjeta no encontrada' });
    res.json({ data: result.recordset[0] });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const limite = parseFloat(req.body.limite_credito || 500000);
    const saldo = parseFloat(req.body.saldo_actual || 0);
    const result = await db.query(`
      DECLARE @id INT = ISNULL((SELECT MAX(C_tarjeta) FROM dbo.TarjetaCredito), 0) + 1;
      DECLARE @cliente INT = ISNULL((SELECT TOP 1 C_cliente FROM dbo.Cliente ORDER BY C_cliente), 1);
      INSERT INTO dbo.TarjetaCredito (C_tarjeta, C_cliente, D_num_tarjeta, M_limite_credito, M_saldo_utilizado,
        M_saldo_disponible, M_tasa_interes, F_emision, F_vencimiento, N_dia_corte, N_dia_pago, D_estado)
      OUTPUT INSERTED.C_tarjeta AS id_tarjeta, 8 AS id_producto, 8 AS tipo_tarjeta,
             INSERTED.D_num_tarjeta AS numero_tarjeta, INSERTED.M_limite_credito AS limite_credito,
             INSERTED.M_saldo_utilizado AS saldo_actual, INSERTED.D_estado AS estado
      VALUES (@id, @cliente, ISNULL(@numero, CONCAT('411111111111', FORMAT(@id, '0000'))), @limite, @saldo,
        @limite - @saldo, 0.3200, GETDATE(), DATEADD(YEAR, 4, GETDATE()), 15, 30, @estado);
    `, [
      { name: 'numero', type: sql.NVarChar(19), value: req.body.numero_tarjeta || null },
      { name: 'limite', type: sql.Decimal(12, 2), value: limite },
      { name: 'saldo', type: sql.Decimal(12, 2), value: saldo },
      { name: 'estado', type: sql.NVarChar(20), value: req.body.estado === '0' ? 'Bloqueada' : (req.body.estado || 'Activa') }
    ]);
    res.status(201).json({ data: result.recordset[0], message: 'Tarjeta creada' });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const result = await db.query(`
      UPDATE dbo.TarjetaCredito
      SET D_num_tarjeta = COALESCE(@numero, D_num_tarjeta),
          M_limite_credito = COALESCE(@limite, M_limite_credito),
          M_saldo_utilizado = COALESCE(@saldo, M_saldo_utilizado),
          M_saldo_disponible = COALESCE(@limite, M_limite_credito) - COALESCE(@saldo, M_saldo_utilizado),
          D_estado = COALESCE(@estado, D_estado)
      OUTPUT INSERTED.C_tarjeta AS id_tarjeta, 8 AS id_producto, 8 AS tipo_tarjeta,
             INSERTED.D_num_tarjeta AS numero_tarjeta, INSERTED.M_limite_credito AS limite_credito,
             INSERTED.M_saldo_utilizado AS saldo_actual, INSERTED.D_estado AS estado
      WHERE C_tarjeta = @id;
    `, [
      { name: 'id', type: sql.Int, value: parseInt(req.params.id) },
      { name: 'numero', type: sql.NVarChar(19), value: req.body.numero_tarjeta || null },
      { name: 'limite', type: sql.Decimal(12, 2), value: req.body.limite_credito ? parseFloat(req.body.limite_credito) : null },
      { name: 'saldo', type: sql.Decimal(12, 2), value: req.body.saldo_actual ? parseFloat(req.body.saldo_actual) : null },
      { name: 'estado', type: sql.NVarChar(20), value: req.body.estado === '0' ? 'Bloqueada' : (req.body.estado || null) }
    ]);
    if (!result.recordset.length) return res.status(404).json({ error: 'Tarjeta no encontrada' });
    res.json({ data: result.recordset[0], message: 'Tarjeta actualizada' });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await db.query(`DELETE FROM dbo.TarjetaCredito WHERE C_tarjeta = @id;`, [{ name: 'id', type: sql.Int, value: parseInt(req.params.id) }]);
    res.json({ message: 'Tarjeta eliminada' });
  } catch (err) { next(err); }
});

module.exports = router;
