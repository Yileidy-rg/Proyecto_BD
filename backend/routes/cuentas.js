const express = require('express');
const router = express.Router();
const db = require('../db');
const sql = db.sql;

router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT C_cuenta AS id_cuenta, C_tipo_producto AS id_producto, C_tipo_producto AS tipo_cuenta,
             D_numero_cuenta AS numero_cuenta, M_saldo_disponible AS saldo, D_estado AS estado
      FROM dbo.Cuenta
      ORDER BY C_cuenta;
    `);
    res.json({ data: result.recordset, total: result.recordset.length });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT C_cuenta AS id_cuenta, C_tipo_producto AS id_producto, C_tipo_producto AS tipo_cuenta,
             D_numero_cuenta AS numero_cuenta, M_saldo_disponible AS saldo, D_estado AS estado
      FROM dbo.Cuenta WHERE C_cuenta = @id;
    `, [{ name: 'id', type: sql.Int, value: parseInt(req.params.id) }]);
    if (!result.recordset.length) return res.status(404).json({ error: 'Cuenta no encontrada' });
    res.json({ data: result.recordset[0] });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const tipo = parseInt(req.body.tipo_cuenta || req.body.id_producto || 1);
    const saldo = parseFloat(req.body.saldo || 0);
    const result = await db.query(`
      DECLARE @id INT = ISNULL((SELECT MAX(C_cuenta) FROM dbo.Cuenta), 0) + 1;
      DECLARE @cliente INT = ISNULL((SELECT TOP 1 C_cliente FROM dbo.Cliente ORDER BY C_cliente), 1);
      INSERT INTO dbo.Cuenta (C_cuenta, C_cliente, C_tipo_producto, D_numero_cuenta, M_saldo_disponible, M_saldo_contable, D_estado)
      OUTPUT INSERTED.C_cuenta AS id_cuenta, INSERTED.C_tipo_producto AS id_producto, INSERTED.C_tipo_producto AS tipo_cuenta,
             INSERTED.D_numero_cuenta AS numero_cuenta, INSERTED.M_saldo_disponible AS saldo, INSERTED.D_estado AS estado
      VALUES (@id, @cliente, @tipo, ISNULL(@numero, CONCAT('CR', FORMAT(@id, '0000000000'))), @saldo, @saldo, @estado);
    `, [
      { name: 'tipo', type: sql.TinyInt, value: tipo },
      { name: 'numero', type: sql.NVarChar(22), value: req.body.numero_cuenta || null },
      { name: 'saldo', type: sql.Decimal(18, 2), value: saldo },
      { name: 'estado', type: sql.NVarChar(20), value: req.body.estado === '0' ? 'Inactiva' : (req.body.estado || 'Activa') }
    ]);
    res.status(201).json({ data: result.recordset[0], message: 'Cuenta creada' });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const result = await db.query(`
      UPDATE dbo.Cuenta
      SET C_tipo_producto = COALESCE(@tipo, C_tipo_producto),
          D_numero_cuenta = COALESCE(@numero, D_numero_cuenta),
          M_saldo_disponible = COALESCE(@saldo, M_saldo_disponible),
          M_saldo_contable = COALESCE(@saldo, M_saldo_contable),
          D_estado = COALESCE(@estado, D_estado)
      OUTPUT INSERTED.C_cuenta AS id_cuenta, INSERTED.C_tipo_producto AS id_producto, INSERTED.C_tipo_producto AS tipo_cuenta,
             INSERTED.D_numero_cuenta AS numero_cuenta, INSERTED.M_saldo_disponible AS saldo, INSERTED.D_estado AS estado
      WHERE C_cuenta = @id;
    `, [
      { name: 'id', type: sql.Int, value: parseInt(req.params.id) },
      { name: 'tipo', type: sql.TinyInt, value: req.body.tipo_cuenta ? parseInt(req.body.tipo_cuenta) : null },
      { name: 'numero', type: sql.NVarChar(22), value: req.body.numero_cuenta || null },
      { name: 'saldo', type: sql.Decimal(18, 2), value: req.body.saldo !== undefined && req.body.saldo !== null ? parseFloat(req.body.saldo) : null },
      { name: 'estado', type: sql.NVarChar(20), value: req.body.estado === '0' ? 'Inactiva' : (req.body.estado || null) }
    ]);
    if (!result.recordset.length) return res.status(404).json({ error: 'Cuenta no encontrada' });
    res.json({ data: result.recordset[0], message: 'Cuenta actualizada' });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await db.query(`DELETE FROM dbo.Cuenta WHERE C_cuenta = @id;`, [{ name: 'id', type: sql.Int, value: parseInt(req.params.id) }]);
    res.json({ message: 'Cuenta eliminada' });
  } catch (err) { next(err); }
});

module.exports = router;
