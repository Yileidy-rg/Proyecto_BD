const express = require('express');
const router = express.Router();
const db = require('../db');
const sql = db.sql;
const { insertRecord, updateRecord, deleteRecord } = require('./_spWrites');
const {
  handleValidation,
  idParam,
  optionalDateBody,
  optionalIdBody,
  optionalIntBody,
  optionalMoneyBody,
  optionalNonEmptyBody,
  requiredIdBody,
  requiredPositiveMoneyBody,
} = require('./_validation');

router.get('/', async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM dbo.vw_api_creditos ORDER BY id_prestamo;');
    res.json({ data: result.recordset, total: result.recordset.length });
  } catch (err) { next(err); }
});

router.get('/:id', [idParam(), handleValidation], async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM dbo.vw_api_creditos WHERE id_prestamo = @id;', [
      { name: 'id', type: sql.Int, value: parseInt(req.params.id) }
    ]);
    if (!result.recordset.length) return res.status(404).json({ error: 'Préstamo no encontrado' });
    res.json({ data: result.recordset[0] });
  } catch (err) { next(err); }
});

router.post('/', [
  requiredIdBody('id_cliente'),
  requiredPositiveMoneyBody('monto'),
  optionalIntBody('plazo_meses', { min: 1, max: 600 }),
  optionalMoneyBody('tasa_interes', { min: 0 }),
  optionalIdBody('tipo_prestamo'),
  optionalIdBody('id_producto'),
  optionalDateBody('fecha_desembolso'),
  optionalNonEmptyBody('numero_operacion', { max: 80 }),
  optionalNonEmptyBody('estado', { max: 40 }),
  handleValidation,
], async (req, res, next) => {
  try {
    const monto = parseFloat(req.body.monto || 0);
    const plazo = parseInt(req.body.plazo_meses || 60);
    const tasa = parseFloat(req.body.tasa_interes || 0.18);
    const tipo = parseInt(req.body.tipo_prestamo || req.body.id_producto || 6);
    const fecha = req.body.fecha_desembolso || new Date().toISOString().slice(0, 10);

    const clienteRes = await db.query('SELECT TOP 1 C_cliente FROM dbo.Cliente ORDER BY C_cliente;');
    const idCliente = req.body.id_cliente ? parseInt(req.body.id_cliente, 10) : (clienteRes.recordset[0]?.C_cliente || 1);
    const vencimiento = new Date(fecha);
    vencimiento.setMonth(vencimiento.getMonth() + plazo);
    const id = await insertRecord('Credito', 'C_credito', {
      C_cliente: idCliente,
      C_tipo_producto: tipo,
      D_num_operacion: req.body.numero_operacion || `CRD${Date.now().toString().slice(-6)}`,
      M_monto_aprobado: monto,
      M_saldo_principal: monto,
      M_tasa_interes: tasa,
      Q_plazo_meses: plazo,
      F_formalizacion: fecha,
      F_vencimiento: vencimiento.toISOString().slice(0, 10),
      M_cuota_mensual: plazo > 0 ? monto / plazo : null,
      D_estado: req.body.estado === '0' ? 'Cancelado' : (req.body.estado || 'Vigente'),
    });
    const result = await db.query('SELECT * FROM dbo.vw_api_creditos WHERE id_prestamo = @id;', [
      { name: 'id', type: sql.Int, value: id },
    ]);
    res.status(201).json({ data: result.recordset[0], message: 'Préstamo creado' });
  } catch (err) { next(err); }
});

router.put('/:id', [
  idParam(),
  optionalIdBody('tipo_prestamo'),
  optionalIdBody('id_producto'),
  optionalMoneyBody('monto', { min: 0 }),
  optionalIntBody('plazo_meses', { min: 1, max: 600 }),
  optionalMoneyBody('tasa_interes', { min: 0 }),
  optionalDateBody('fecha_desembolso'),
  optionalNonEmptyBody('estado', { max: 40 }),
  handleValidation,
], async (req, res, next) => {
  try {
    const payload = {};
    if (req.body.tipo_prestamo !== undefined) payload.C_tipo_producto = parseInt(req.body.tipo_prestamo, 10);
    if (req.body.id_producto !== undefined) payload.C_tipo_producto = parseInt(req.body.id_producto, 10);
    if (req.body.monto !== undefined) {
      payload.M_monto_aprobado = parseFloat(req.body.monto);
      payload.M_saldo_principal = parseFloat(req.body.monto);
    }
    if (req.body.plazo_meses !== undefined) payload.Q_plazo_meses = parseInt(req.body.plazo_meses, 10);
    if (req.body.tasa_interes !== undefined) payload.M_tasa_interes = parseFloat(req.body.tasa_interes);
    if (req.body.fecha_desembolso !== undefined) payload.F_formalizacion = req.body.fecha_desembolso || null;
    if (req.body.estado !== undefined) payload.D_estado = req.body.estado === '0' ? 'Cancelado' : req.body.estado;

    await updateRecord('Credito', 'C_credito', req.params.id, payload);
    const result = await db.query('SELECT * FROM dbo.vw_api_creditos WHERE id_prestamo = @id;', [
      { name: 'id', type: sql.Int, value: parseInt(req.params.id, 10) },
    ]);
    if (!result.recordset.length) return res.status(404).json({ error: 'Préstamo no encontrado' });
    res.json({ data: result.recordset[0], message: 'Préstamo actualizado' });
  } catch (err) { next(err); }
});

router.delete('/:id', [idParam(), handleValidation], async (req, res, next) => {
  try {
    await deleteRecord('Credito', 'C_credito', req.params.id);
    res.json({ message: 'Préstamo eliminado' });
  } catch (err) { next(err); }
});

module.exports = router;
