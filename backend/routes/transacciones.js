const express = require('express');
const router = express.Router();
const db = require('../db');
const sql = db.sql;

const SELECT_TX = `
  SELECT
    t.N_id_transaccion AS id_transaccion,
    COALESCE(t.N_cuenta, t.N_credito, t.N_tarjeta, t.N_deposito_plazo, t.N_leasing, t.N_transferencia) AS id_producto,
    tt.D_descripcion AS tipo_transaccion,
    t.M_monto AS monto,
    t.D_descripcion AS descripcion,
    t.F_transaccion AS fecha,
    t.C_cliente AS id_cliente,
    t.C_tipo_producto AS tipo_producto
  FROM dbo.Transaccion t
  LEFT JOIN dbo.cat_TipoTransaccion tt ON tt.N_tipo_transaccion = t.C_tipo_transaccion
`;

router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(`${SELECT_TX} ORDER BY t.F_transaccion DESC, t.N_id_transaccion DESC;`);
    res.json({ data: result.recordset, total: result.recordset.length });
  } catch (err) { next(err); }
});

router.get('/producto/:idProducto', async (req, res, next) => {
  try {
    const id = parseInt(req.params.idProducto);
    const result = await db.query(`
      ${SELECT_TX}
      WHERE t.N_cuenta = @id OR t.N_credito = @id OR t.N_tarjeta = @id OR t.N_deposito_plazo = @id OR t.N_leasing = @id OR t.N_transferencia = @id
      ORDER BY t.F_transaccion DESC;
    `, [{ name: 'id', type: sql.Int, value: id }]);
    res.json({ data: result.recordset, total: result.recordset.length });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(`${SELECT_TX} WHERE t.N_id_transaccion = @id;`, [
      { name: 'id', type: sql.BigInt, value: parseInt(req.params.id) }
    ]);
    if (!result.recordset.length) return res.status(404).json({ error: 'Transacción no encontrada' });
    res.json({ data: result.recordset[0] });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const idProducto = parseInt(req.body.id_producto);
    const monto = parseFloat(req.body.monto);
    if (!idProducto || !monto) return res.status(400).json({ error: 'id_producto y monto son requeridos' });

    const result = await db.query(`
      DECLARE @id BIGINT = ISNULL((SELECT MAX(N_id_transaccion) FROM dbo.Transaccion), 0) + 1;
      DECLARE @cliente INT = NULL;
      DECLARE @tipoProd TINYINT = NULL;
      DECLARE @cuenta INT = NULL;
      DECLARE @credito INT = NULL;
      DECLARE @tarjeta INT = NULL;
      DECLARE @tipoTx SMALLINT = ISNULL((
        SELECT TOP 1 N_tipo_transaccion
        FROM dbo.cat_TipoTransaccion
        WHERE UPPER(REPLACE(D_descripcion, ' ', '_')) = UPPER(@tipoTexto)
           OR UPPER(D_descripcion) LIKE '%' + UPPER(REPLACE(@tipoTexto, '_', ' ')) + '%'
      ), 1);

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

      INSERT INTO dbo.Transaccion (N_id_transaccion, C_cliente, C_tipo_transaccion, C_tipo_producto,
        N_cuenta, N_credito, N_tarjeta, M_monto, D_descripcion, F_transaccion)
      VALUES (@id, @cliente, @tipoTx, @tipoProd, @cuenta, @credito, @tarjeta, @monto, @descripcion, GETDATE());

      ${SELECT_TX}
      WHERE t.N_id_transaccion = @id;
    `, [
      { name: 'producto', type: sql.Int, value: idProducto },
      { name: 'tipoTexto', type: sql.NVarChar(80), value: req.body.tipo_transaccion || 'Depósito' },
      { name: 'monto', type: sql.Decimal(18, 2), value: monto },
      { name: 'descripcion', type: sql.NVarChar(200), value: req.body.descripcion || null }
    ]);
    res.status(201).json({ data: result.recordset[0], message: 'Transacción registrada' });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const result = await db.query(`
      UPDATE dbo.Transaccion
      SET M_monto = COALESCE(@monto, M_monto),
          D_descripcion = COALESCE(@descripcion, D_descripcion)
      WHERE N_id_transaccion = @id;
      ${SELECT_TX} WHERE t.N_id_transaccion = @id;
    `, [
      { name: 'id', type: sql.BigInt, value: parseInt(req.params.id) },
      { name: 'monto', type: sql.Decimal(18, 2), value: req.body.monto ? parseFloat(req.body.monto) : null },
      { name: 'descripcion', type: sql.NVarChar(200), value: req.body.descripcion || null }
    ]);
    if (!result.recordset.length) return res.status(404).json({ error: 'Transacción no encontrada' });
    res.json({ data: result.recordset[0], message: 'Transacción actualizada' });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await db.query(`DELETE FROM dbo.Transaccion WHERE N_id_transaccion = @id;`, [
      { name: 'id', type: sql.BigInt, value: parseInt(req.params.id) }
    ]);
    res.json({ message: 'Transacción eliminada' });
  } catch (err) { next(err); }
});

module.exports = router;
