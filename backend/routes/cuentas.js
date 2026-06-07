const express = require('express');
const router = express.Router();
const db = require('../db');
const sql = db.sql;
const { insertRecord, updateRecord, deleteRecord } = require('./_spWrites');

router.get('/', async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM dbo.vw_api_cuentas ORDER BY id_cuenta;');
    res.json({ data: result.recordset, total: result.recordset.length });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM dbo.vw_api_cuentas WHERE id_cuenta = @id;', [
      { name: 'id', type: sql.Int, value: parseInt(req.params.id) }
    ]);
    if (!result.recordset.length) return res.status(404).json({ error: 'Cuenta no encontrada' });
    res.json({ data: result.recordset[0] });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const tipo = parseInt(req.body.tipo_cuenta || req.body.id_producto || 1);
    const saldo = parseFloat(req.body.saldo || 0);
    const clienteRes = await db.query('SELECT TOP 1 C_cliente FROM dbo.Cliente ORDER BY C_cliente;');
    const idCliente = req.body.id_cliente ? parseInt(req.body.id_cliente, 10) : (clienteRes.recordset[0]?.C_cliente || 1);
    const id = await insertRecord('Cuenta', 'C_cuenta', {
      C_cliente: idCliente,
      C_tipo_producto: tipo,
      D_numero_cuenta: req.body.numero_cuenta || `CR${Date.now().toString().slice(-10)}`,
      M_saldo_disponible: saldo,
      M_saldo_contable: saldo,
      D_estado: req.body.estado === '0' ? 'Inactiva' : (req.body.estado || 'Activa'),
    });
    const result = await db.query('SELECT * FROM dbo.vw_api_cuentas WHERE id_cuenta = @id;', [
      { name: 'id', type: sql.Int, value: id },
    ]);
    res.status(201).json({ data: result.recordset[0], message: 'Cuenta creada' });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const payload = {};
    if (req.body.tipo_cuenta !== undefined) payload.C_tipo_producto = parseInt(req.body.tipo_cuenta, 10);
    if (req.body.id_producto !== undefined) payload.C_tipo_producto = parseInt(req.body.id_producto, 10);
    if (req.body.numero_cuenta !== undefined) payload.D_numero_cuenta = req.body.numero_cuenta || null;
    if (req.body.saldo !== undefined) {
      payload.M_saldo_disponible = parseFloat(req.body.saldo);
      payload.M_saldo_contable = parseFloat(req.body.saldo);
    }
    if (req.body.estado !== undefined) payload.D_estado = req.body.estado === '0' ? 'Inactiva' : req.body.estado;

    await updateRecord('Cuenta', 'C_cuenta', req.params.id, payload);
    const result = await db.query('SELECT * FROM dbo.vw_api_cuentas WHERE id_cuenta = @id;', [
      { name: 'id', type: sql.Int, value: parseInt(req.params.id, 10) },
    ]);
    if (!result.recordset.length) return res.status(404).json({ error: 'Cuenta no encontrada' });
    res.json({ data: result.recordset[0], message: 'Cuenta actualizada' });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await deleteRecord('Cuenta', 'C_cuenta', req.params.id);
    res.json({ message: 'Cuenta eliminada' });
  } catch (err) { next(err); }
});

module.exports = router;
