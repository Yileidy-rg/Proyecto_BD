const express = require('express');
const router = express.Router();
const db = require('../db');
const sql = db.sql;

router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT C_credito AS id_prestamo, C_tipo_producto AS id_producto, C_tipo_producto AS tipo_prestamo,
             M_monto_aprobado AS monto, Q_plazo_meses AS plazo_meses, M_tasa_interes AS tasa_interes,
             F_formalizacion AS fecha_desembolso, D_estado AS estado
      FROM dbo.Credito
      ORDER BY C_credito;
    `);
    res.json({ data: result.recordset, total: result.recordset.length });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT C_credito AS id_prestamo, C_tipo_producto AS id_producto, C_tipo_producto AS tipo_prestamo,
             M_monto_aprobado AS monto, Q_plazo_meses AS plazo_meses, M_tasa_interes AS tasa_interes,
             F_formalizacion AS fecha_desembolso, D_estado AS estado
      FROM dbo.Credito WHERE C_credito = @id;
    `, [{ name: 'id', type: sql.Int, value: parseInt(req.params.id) }]);
    if (!result.recordset.length) return res.status(404).json({ error: 'Préstamo no encontrado' });
    res.json({ data: result.recordset[0] });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const monto = parseFloat(req.body.monto || 0);
    const plazo = parseInt(req.body.plazo_meses || 60);
    const tasa = parseFloat(req.body.tasa_interes || 0.18);
    const tipo = parseInt(req.body.tipo_prestamo || req.body.id_producto || 6);
    const fecha = req.body.fecha_desembolso || new Date().toISOString().slice(0, 10);

    const result = await db.query(`
      DECLARE @id INT = ISNULL((SELECT MAX(C_credito) FROM dbo.Credito), 0) + 1;
      DECLARE @cliente INT = ISNULL((SELECT TOP 1 C_cliente FROM dbo.Cliente ORDER BY C_cliente), 1);
      INSERT INTO dbo.Credito (C_credito, C_cliente, C_tipo_producto, D_num_operacion, M_monto_aprobado,
        M_saldo_principal, M_tasa_interes, Q_plazo_meses, F_formalizacion, F_vencimiento, M_cuota_mensual, D_estado)
      OUTPUT INSERTED.C_credito AS id_prestamo, INSERTED.C_tipo_producto AS id_producto, INSERTED.C_tipo_producto AS tipo_prestamo,
             INSERTED.M_monto_aprobado AS monto, INSERTED.Q_plazo_meses AS plazo_meses, INSERTED.M_tasa_interes AS tasa_interes,
             INSERTED.F_formalizacion AS fecha_desembolso, INSERTED.D_estado AS estado
      VALUES (@id, @cliente, @tipo, CONCAT('CRD', FORMAT(@id, '000000')), @monto,
        @monto, @tasa, @plazo, @fecha, DATEADD(MONTH, @plazo, @fecha), CASE WHEN @plazo > 0 THEN @monto / @plazo ELSE NULL END, @estado);
    `, [
      { name: 'tipo', type: sql.TinyInt, value: tipo },
      { name: 'monto', type: sql.Decimal(18, 2), value: monto },
      { name: 'tasa', type: sql.Decimal(6, 4), value: tasa },
      { name: 'plazo', type: sql.Int, value: plazo },
      { name: 'fecha', type: sql.Date, value: fecha },
      { name: 'estado', type: sql.NVarChar(20), value: req.body.estado === '0' ? 'Cancelado' : (req.body.estado || 'Vigente') }
    ]);
    res.status(201).json({ data: result.recordset[0], message: 'Préstamo creado' });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const result = await db.query(`
      UPDATE dbo.Credito
      SET C_tipo_producto = COALESCE(@tipo, C_tipo_producto),
          M_monto_aprobado = COALESCE(@monto, M_monto_aprobado),
          M_saldo_principal = COALESCE(@monto, M_saldo_principal),
          Q_plazo_meses = COALESCE(@plazo, Q_plazo_meses),
          M_tasa_interes = COALESCE(@tasa, M_tasa_interes),
          F_formalizacion = COALESCE(@fecha, F_formalizacion),
          D_estado = COALESCE(@estado, D_estado)
      OUTPUT INSERTED.C_credito AS id_prestamo, INSERTED.C_tipo_producto AS id_producto, INSERTED.C_tipo_producto AS tipo_prestamo,
             INSERTED.M_monto_aprobado AS monto, INSERTED.Q_plazo_meses AS plazo_meses, INSERTED.M_tasa_interes AS tasa_interes,
             INSERTED.F_formalizacion AS fecha_desembolso, INSERTED.D_estado AS estado
      WHERE C_credito = @id;
    `, [
      { name: 'id', type: sql.Int, value: parseInt(req.params.id) },
      { name: 'tipo', type: sql.TinyInt, value: req.body.tipo_prestamo ? parseInt(req.body.tipo_prestamo) : null },
      { name: 'monto', type: sql.Decimal(18, 2), value: req.body.monto ? parseFloat(req.body.monto) : null },
      { name: 'plazo', type: sql.Int, value: req.body.plazo_meses ? parseInt(req.body.plazo_meses) : null },
      { name: 'tasa', type: sql.Decimal(6, 4), value: req.body.tasa_interes ? parseFloat(req.body.tasa_interes) : null },
      { name: 'fecha', type: sql.Date, value: req.body.fecha_desembolso || null },
      { name: 'estado', type: sql.NVarChar(20), value: req.body.estado === '0' ? 'Cancelado' : (req.body.estado || null) }
    ]);
    if (!result.recordset.length) return res.status(404).json({ error: 'Préstamo no encontrado' });
    res.json({ data: result.recordset[0], message: 'Préstamo actualizado' });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await db.query(`DELETE FROM dbo.Credito WHERE C_credito = @id;`, [{ name: 'id', type: sql.Int, value: parseInt(req.params.id) }]);
    res.json({ message: 'Préstamo eliminado' });
  } catch (err) { next(err); }
});

module.exports = router;
