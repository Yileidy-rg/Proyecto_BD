const express = require('express');
const router = express.Router();
const db = require('../db');
const sql = db.sql;
const { insertRecord, updateRecord, deleteRecord } = require('./_spWrites');

const SELECT_TX = `
  SELECT *
  FROM dbo.vw_api_transacciones
`;

router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(`${SELECT_TX} ORDER BY fecha DESC, id_transaccion DESC;`);
    res.json({ data: result.recordset, total: result.recordset.length });
  } catch (err) { next(err); }
});

router.get('/producto/:idProducto', async (req, res, next) => {
  try {
    const id = parseInt(req.params.idProducto);
    const result = await db.query(`
      ${SELECT_TX}
      WHERE N_cuenta = @id OR N_credito = @id OR N_tarjeta = @id OR N_deposito_plazo = @id OR N_leasing = @id OR N_transferencia = @id
      ORDER BY fecha DESC;
    `, [{ name: 'id', type: sql.Int, value: id }]);
    res.json({ data: result.recordset, total: result.recordset.length });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(`${SELECT_TX} WHERE id_transaccion = @id;`, [
      { name: 'id', type: sql.BigInt, value: parseInt(req.params.id) }
    ]);
    if (!result.recordset.length) return res.status(404).json({ error: 'Transacci\u00f3n no encontrada' });
    res.json({ data: result.recordset[0] });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const idProducto = parseInt(req.body.id_producto);
    const monto = parseFloat(req.body.monto);
    if (!idProducto || !monto) return res.status(400).json({ error: 'id_producto y monto son requeridos' });

    const meta = await db.query(`
      DECLARE @cliente INT = NULL;
      DECLARE @tipoProd TINYINT = NULL;
      DECLARE @cuenta INT = NULL;
      DECLARE @credito INT = NULL;
      DECLARE @tarjeta INT = NULL;

      IF EXISTS (SELECT 1 FROM dbo.Cuenta WHERE C_cuenta = @producto)
      BEGIN
        SELECT @cliente = C_cliente, @tipoProd = C_tipo_producto, @cuenta = C_cuenta FROM dbo.Cuenta WHERE C_cuenta = @producto;
      END
      ELSE IF EXISTS (SELECT 1 FROM dbo.Credito WHERE C_credito = @producto)
      BEGIN
        SELECT @cliente = C_cliente, @tipoProd = C_tipo_producto, @credito = C_credito FROM dbo.Credito WHERE C_credito = @producto;
      END
      ELSE IF EXISTS (SELECT 1 FROM dbo.TarjetaCredito WHERE C_tarjeta = @producto)
      BEGIN
        SELECT @cliente = C_cliente, @tipoProd = 8, @tarjeta = C_tarjeta FROM dbo.TarjetaCredito WHERE C_tarjeta = @producto;
      END
      ELSE
      BEGIN
        SELECT TOP 1 @cliente = C_cliente FROM dbo.Cliente ORDER BY C_cliente;
        SET @tipoProd = 1;
      END

      SELECT
        @cliente AS cliente,
        @tipoProd AS tipo_producto,
        @cuenta AS cuenta,
        @credito AS credito,
        @tarjeta AS tarjeta,
        ISNULL((
          SELECT TOP 1 N_tipo_transaccion
          FROM dbo.cat_TipoTransaccion
          WHERE UPPER(REPLACE(D_descripcion, ' ', '_')) = UPPER(@tipoTexto)
             OR UPPER(D_descripcion) LIKE '%' + UPPER(REPLACE(@tipoTexto, '_', ' ')) + '%'
        ), 1) AS tipo_transaccion;
    `, [
      { name: 'producto', type: sql.Int, value: idProducto },
      { name: 'tipoTexto', type: sql.NVarChar(80), value: req.body.tipo_transaccion || 'Deposito' },
    ]);

    const row = meta.recordset[0] || {};
    const id = await insertRecord('Transaccion', 'N_id_transaccion', {
      C_cliente: row.cliente,
      C_tipo_transaccion: row.tipo_transaccion,
      C_tipo_producto: row.tipo_producto,
      N_cuenta: row.cuenta,
      N_credito: row.credito,
      N_tarjeta: row.tarjeta,
      M_monto: monto,
      D_descripcion: req.body.descripcion || null,
      F_transaccion: new Date(),
    });

    const result = await db.query(`${SELECT_TX} WHERE id_transaccion = @id;`, [
      { name: 'id', type: sql.BigInt, value: id },
    ]);
    res.status(201).json({ data: result.recordset[0], message: 'Transacci\u00f3n registrada' });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const payload = {};
    if (req.body.monto !== undefined) payload.M_monto = parseFloat(req.body.monto);
    if (req.body.descripcion !== undefined) payload.D_descripcion = req.body.descripcion || null;

    await updateRecord('Transaccion', 'N_id_transaccion', req.params.id, payload);
    const result = await db.query(`${SELECT_TX} WHERE id_transaccion = @id;`, [
      { name: 'id', type: sql.BigInt, value: parseInt(req.params.id, 10) },
    ]);
    if (!result.recordset.length) return res.status(404).json({ error: 'Transacci\u00f3n no encontrada' });
    res.json({ data: result.recordset[0], message: 'Transacci\u00f3n actualizada' });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await deleteRecord('Transaccion', 'N_id_transaccion', req.params.id);
    res.json({ message: 'Transacci\u00f3n eliminada' });
  } catch (err) { next(err); }
});

module.exports = router;
