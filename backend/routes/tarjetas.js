const express = require('express');
const router = express.Router();
const db = require('../db');
const sql = db.sql;
const { insertRecord, updateRecord, deleteRecord } = require('./_spWrites');
const {
  handleValidation,
  idParam,
  optionalMoneyBody,
  optionalNonEmptyBody,
  requiredIdBody,
  requiredPositiveMoneyBody,
} = require('./_validation');

router.get('/', async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM dbo.vw_api_tarjetas ORDER BY id_tarjeta;');
    res.json({ data: result.recordset, total: result.recordset.length });
  } catch (err) { next(err); }
});

router.get('/:id', [idParam(), handleValidation], async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM dbo.vw_api_tarjetas WHERE id_tarjeta = @id;', [
      { name: 'id', type: sql.Int, value: parseInt(req.params.id) }
    ]);
    if (!result.recordset.length) return res.status(404).json({ error: 'Tarjeta no encontrada' });
    res.json({ data: result.recordset[0] });
  } catch (err) { next(err); }
});

router.post('/', [
  requiredIdBody('id_cliente'),
  optionalNonEmptyBody('numero_tarjeta', { max: 30 }),
  requiredPositiveMoneyBody('limite_credito'),
  optionalMoneyBody('saldo_actual', { min: 0 }),
  optionalNonEmptyBody('estado', { max: 40 }),
  handleValidation,
], async (req, res, next) => {
  try {
    const limite = parseFloat(req.body.limite_credito || 500000);
    const saldo = parseFloat(req.body.saldo_actual || 0);
    const clienteRes = await db.query('SELECT TOP 1 C_cliente FROM dbo.Cliente ORDER BY C_cliente;');
    const idCliente = req.body.id_cliente ? parseInt(req.body.id_cliente, 10) : (clienteRes.recordset[0]?.C_cliente || 1);
    const vencimiento = new Date();
    vencimiento.setFullYear(vencimiento.getFullYear() + 4);
    const id = await insertRecord('TarjetaCredito', 'C_tarjeta', {
      C_cliente: idCliente,
      D_num_tarjeta: req.body.numero_tarjeta || `411111111111${Date.now().toString().slice(-4)}`,
      M_limite_credito: limite,
      M_saldo_utilizado: saldo,
      M_saldo_disponible: limite - saldo,
      M_tasa_interes: 0.32,
      F_emision: new Date().toISOString().slice(0, 10),
      F_vencimiento: vencimiento.toISOString().slice(0, 10),
      N_dia_corte: 15,
      N_dia_pago: 30,
      D_estado: req.body.estado === '0' ? 'Bloqueada' : (req.body.estado || 'Activa'),
    });
    const result = await db.query('SELECT * FROM dbo.vw_api_tarjetas WHERE id_tarjeta = @id;', [
      { name: 'id', type: sql.Int, value: id },
    ]);
    res.status(201).json({ data: result.recordset[0], message: 'Tarjeta creada' });
  } catch (err) { next(err); }
});

router.put('/:id', [
  idParam(),
  optionalNonEmptyBody('numero_tarjeta', { max: 30 }),
  optionalMoneyBody('limite_credito', { min: 0 }),
  optionalMoneyBody('saldo_actual', { min: 0 }),
  optionalNonEmptyBody('estado', { max: 40 }),
  handleValidation,
], async (req, res, next) => {
  try {
    const payload = {};
    if (req.body.numero_tarjeta !== undefined) payload.D_num_tarjeta = req.body.numero_tarjeta || null;
    if (req.body.limite_credito !== undefined) payload.M_limite_credito = parseFloat(req.body.limite_credito);
    if (req.body.saldo_actual !== undefined) payload.M_saldo_utilizado = parseFloat(req.body.saldo_actual);
    if (req.body.limite_credito !== undefined || req.body.saldo_actual !== undefined) {
      const actual = await db.query('SELECT M_limite_credito, M_saldo_utilizado FROM dbo.TarjetaCredito WHERE C_tarjeta = @id;', [
        { name: 'id', type: sql.Int, value: parseInt(req.params.id, 10) },
      ]);
      const row = actual.recordset[0] || {};
      const nuevoLimite = payload.M_limite_credito !== undefined ? payload.M_limite_credito : Number(row.M_limite_credito || 0);
      const nuevoSaldo = payload.M_saldo_utilizado !== undefined ? payload.M_saldo_utilizado : Number(row.M_saldo_utilizado || 0);
      payload.M_saldo_disponible = nuevoLimite - nuevoSaldo;
    }
    if (req.body.estado !== undefined) payload.D_estado = req.body.estado === '0' ? 'Bloqueada' : req.body.estado;

    await updateRecord('TarjetaCredito', 'C_tarjeta', req.params.id, payload);
    const result = await db.query('SELECT * FROM dbo.vw_api_tarjetas WHERE id_tarjeta = @id;', [
      { name: 'id', type: sql.Int, value: parseInt(req.params.id, 10) },
    ]);
    if (!result.recordset.length) return res.status(404).json({ error: 'Tarjeta no encontrada' });
    res.json({ data: result.recordset[0], message: 'Tarjeta actualizada' });
  } catch (err) { next(err); }
});

router.delete('/:id', [idParam(), handleValidation], async (req, res, next) => {
  try {
    await deleteRecord('TarjetaCredito', 'C_tarjeta', req.params.id);
    res.json({ message: 'Tarjeta eliminada' });
  } catch (err) { next(err); }
});

module.exports = router;
