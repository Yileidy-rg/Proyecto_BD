const express = require('express');
const router = express.Router();
const db = require('../db');
const sql = db.sql;
const { insertRecord } = require('./_spWrites');

const SELECT_PRODUCTOS = `
  SELECT TOP (@limite) *
  FROM (
    SELECT
      c.C_cuenta AS id_producto,
      c.C_cliente AS id_cliente,
      c.C_tipo_producto AS tipo_producto,
      tp.D_descripcion AS tipo_producto_desc,
      c.C_moneda AS moneda,
      c.F_apertura AS fecha_apertura,
      UPPER(c.D_estado) AS estado,
      CONCAT('Cuenta ', c.D_numero_cuenta) AS descripcion,
      'Cuenta' AS origen
    FROM dbo.Cuenta c
    LEFT JOIN dbo.cat_TipoProducto tp ON tp.N_tipo_producto = c.C_tipo_producto

    UNION ALL
    SELECT
      dp.C_deposito,
      dp.C_cliente,
      2,
      tp.D_descripcion,
      dp.C_moneda,
      dp.F_emision,
      UPPER(dp.D_estado),
      CONCAT('Deposito a plazo ', dp.D_numero_cert),
      'DepositoPlazo'
    FROM dbo.DepositoPlazo dp
    LEFT JOIN dbo.cat_TipoProducto tp ON tp.N_tipo_producto = 2

    UNION ALL
    SELECT
      dj.C_dep_judicial,
      dj.C_cliente,
      5,
      tp.D_descripcion,
      dj.C_moneda,
      dj.F_deposito,
      UPPER(dj.D_estado),
      CONCAT('Deposito judicial ', dj.D_num_expediente),
      'DepositoJudicial'
    FROM dbo.DepositoJudicial dj
    LEFT JOIN dbo.cat_TipoProducto tp ON tp.N_tipo_producto = 5

    UNION ALL
    SELECT
      cr.C_credito,
      cr.C_cliente,
      cr.C_tipo_producto,
      tp.D_descripcion,
      cr.C_moneda,
      cr.F_formalizacion,
      UPPER(cr.D_estado),
      CONCAT('Credito ', cr.D_num_operacion),
      'Credito'
    FROM dbo.Credito cr
    LEFT JOIN dbo.cat_TipoProducto tp ON tp.N_tipo_producto = cr.C_tipo_producto

    UNION ALL
    SELECT
      tc.C_tarjeta,
      tc.C_cliente,
      8,
      tp.D_descripcion,
      tc.C_moneda,
      tc.F_emision,
      UPPER(tc.D_estado),
      CONCAT('Tarjeta ', tc.D_num_tarjeta),
      'TarjetaCredito'
    FROM dbo.TarjetaCredito tc
    LEFT JOIN dbo.cat_TipoProducto tp ON tp.N_tipo_producto = 8

    UNION ALL
    SELECT
      l.C_leasing,
      l.C_cliente,
      11,
      tp.D_descripcion,
      l.C_moneda,
      l.F_inicio,
      UPPER(l.D_estado),
      CONCAT('Leasing ', l.D_num_contrato),
      'Leasing'
    FROM dbo.Leasing l
    LEFT JOIN dbo.cat_TipoProducto tp ON tp.N_tipo_producto = 11

    UNION ALL
    SELECT
      a.C_aval,
      a.C_cliente,
      12,
      tp.D_descripcion,
      a.C_moneda,
      a.F_emision,
      UPPER(a.D_estado),
      CONCAT('Aval ', a.D_num_documento),
      'AvalGarantia'
    FROM dbo.AvalGarantia a
    LEFT JOIN dbo.cat_TipoProducto tp ON tp.N_tipo_producto = 12

    UNION ALL
    SELECT
      t.C_transferencia,
      t.C_cliente,
      t.C_tipo_producto,
      tp.D_descripcion,
      t.C_moneda,
      CAST(t.F_transaccion AS date),
      UPPER(t.D_estado),
      CONCAT('Transferencia ', t.D_num_referencia),
      'Transferencia'
    FROM dbo.Transferencia t
    LEFT JOIN dbo.cat_TipoProducto tp ON tp.N_tipo_producto = t.C_tipo_producto

    UNION ALL
    SELECT
      od.C_operacion,
      od.C_cliente,
      15,
      tp.D_descripcion,
      od.C_moneda_origen,
      CAST(od.F_operacion AS date),
      'ACTIVA',
      CONCAT('Divisas ', od.T_tipo_operacion),
      'OperacionDivisas'
    FROM dbo.OperacionDivisas od
    LEFT JOIN dbo.cat_TipoProducto tp ON tp.N_tipo_producto = 15

    UNION ALL
    SELECT
      f.C_fideicomiso,
      f.C_cliente,
      16,
      tp.D_descripcion,
      f.C_moneda,
      f.F_constitucion,
      UPPER(f.D_estado),
      CONCAT('Fideicomiso ', f.D_num_contrato),
      'Fideicomiso'
    FROM dbo.Fideicomiso f
    LEFT JOIN dbo.cat_TipoProducto tp ON tp.N_tipo_producto = 16

    UNION ALL
    SELECT
      atm.C_uso_atm,
      atm.C_cliente,
      17,
      tp.D_descripcion,
      atm.C_moneda,
      CAST(atm.F_operacion AS date),
      'ACTIVA',
      CONCAT('ATM ', atm.D_codigo_atm),
      'UsoATM'
    FROM dbo.UsoATM atm
    LEFT JOIN dbo.cat_TipoProducto tp ON tp.N_tipo_producto = 17

    UNION ALL
    SELECT
      bl.C_operacion_bl,
      bl.C_cliente,
      18,
      tp.D_descripcion,
      ISNULL(bl.C_moneda, 1),
      CAST(bl.F_operacion AS date),
      UPPER(bl.D_estado),
      CONCAT('Banca en linea ', bl.D_tipo_operacion),
      'BancaEnLinea'
    FROM dbo.BancaEnLinea bl
    LEFT JOIN dbo.cat_TipoProducto tp ON tp.N_tipo_producto = 18

    UNION ALL
    SELECT
      cs.C_caja,
      cs.C_cliente,
      19,
      tp.D_descripcion,
      1,
      cs.F_inicio,
      UPPER(cs.D_estado),
      CONCAT('Caja seguridad ', cs.D_numero_caja),
      'CajaSeguridad'
    FROM dbo.CajaSeguridad cs
    LEFT JOIN dbo.cat_TipoProducto tp ON tp.N_tipo_producto = 19
  ) p
  WHERE (@cliente IS NULL OR p.id_cliente = @cliente)
  ORDER BY p.id_cliente, p.tipo_producto, p.id_producto
`;

function intOrNull(value) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function money(value, fallback) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function fechaHoy(value) {
  return value || new Date().toISOString().slice(0, 10);
}

router.get('/tipos', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        N_tipo_producto AS value,
        D_descripcion AS label,
        C_tipo_operacion AS tipo_operacion
      FROM dbo.cat_TipoProducto
      ORDER BY N_tipo_producto;
    `);
    res.json({ data: result.recordset, total: result.recordset.length });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const limite = Math.min(Math.max(parseInt(req.query.limite || '200', 10), 1), 1000);
    const cliente = intOrNull(req.query.cliente || req.query.id_cliente);
    const result = await db.query(SELECT_PRODUCTOS, [
      { name: 'limite', type: sql.Int, value: limite },
      { name: 'cliente', type: sql.Int, value: cliente },
    ]);
    res.json({ data: result.recordset, total: result.recordset.length });
  } catch (err) {
    next(err);
  }
});

router.get('/cliente/:idCliente', async (req, res, next) => {
  try {
    const result = await db.query(SELECT_PRODUCTOS, [
      { name: 'limite', type: sql.Int, value: 1000 },
      { name: 'cliente', type: sql.Int, value: parseInt(req.params.idCliente, 10) },
    ]);
    res.json({ data: result.recordset, total: result.recordset.length });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT *
      FROM (${SELECT_PRODUCTOS.replace('SELECT TOP (@limite) *', 'SELECT *')}) q
      WHERE q.id_producto = @id;
    `, [
      { name: 'limite', type: sql.Int, value: 1000 },
      { name: 'cliente', type: sql.Int, value: null },
      { name: 'id', type: sql.Int, value: parseInt(req.params.id, 10) },
    ]);
    if (!result.recordset.length) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const idCliente = intOrNull(req.body.id_cliente);
    const tipo = intOrNull(req.body.tipo_producto);
    const moneda = intOrNull(req.body.moneda) || 1;
    const fecha = fechaHoy(req.body.fecha_apertura);
    const estado = req.body.estado || 'Activo';
    const monto = money(req.body.monto || req.body.saldo || req.body.limite_credito, 500000);
    const plazoMeses = intOrNull(req.body.plazo_meses) || 60;
    const plazoDias = intOrNull(req.body.plazo_dias) || 180;
    const tasa = money(req.body.tasa_interes, 0.18);

    if (!idCliente || !tipo) {
      return res.status(400).json({ error: 'id_cliente y tipo_producto son requeridos' });
    }

    const addMonths = (base, months) => {
      const d = new Date(base);
      d.setMonth(d.getMonth() + months);
      return d.toISOString().slice(0, 10);
    };
    const addDays = (base, days) => {
      const d = new Date(base);
      d.setDate(d.getDate() + days);
      return d.toISOString().slice(0, 10);
    };

    let table;
    let idColumn;
    let payload;

    if ([1, 3, 4].includes(tipo)) {
      table = 'Cuenta';
      idColumn = 'C_cuenta';
      payload = { C_cliente: idCliente, C_tipo_producto: tipo, D_numero_cuenta: `CTA${Date.now().toString().slice(-10)}`, C_moneda: moneda, M_saldo_disponible: monto, M_saldo_contable: monto, F_apertura: fecha, D_estado: estado };
    } else if (tipo === 2) {
      table = 'DepositoPlazo';
      idColumn = 'C_deposito';
      payload = { C_cliente: idCliente, D_numero_cert: `DP${Date.now().toString().slice(-6)}`, C_moneda: moneda, M_monto_principal: monto, M_tasa_interes: tasa, Q_plazo_dias: plazoDias, F_emision: fecha, F_vencimiento: addDays(fecha, plazoDias), D_estado: estado };
    } else if (tipo === 5) {
      table = 'DepositoJudicial';
      idColumn = 'C_dep_judicial';
      payload = { C_cliente: idCliente, D_num_expediente: `EXP${Date.now().toString().slice(-6)}`, D_tribunal_origen: 'Tribunal Central', C_moneda: moneda, M_monto: monto, F_deposito: fecha, D_estado: estado };
    } else if ([6, 7, 9, 10].includes(tipo)) {
      table = 'Credito';
      idColumn = 'C_credito';
      payload = { C_cliente: idCliente, C_tipo_producto: tipo, D_num_operacion: `CRD${Date.now().toString().slice(-6)}`, C_moneda: moneda, M_monto_aprobado: monto, M_saldo_principal: monto, M_tasa_interes: tasa, Q_plazo_meses: plazoMeses, F_formalizacion: fecha, F_vencimiento: addMonths(fecha, plazoMeses), M_cuota_mensual: monto / plazoMeses, Q_dias_mora: 0, D_estado: estado };
    } else if (tipo === 8) {
      table = 'TarjetaCredito';
      idColumn = 'C_tarjeta';
      payload = { C_cliente: idCliente, D_num_tarjeta: `411111111111${Date.now().toString().slice(-4)}`, C_moneda: moneda, M_limite_credito: monto, M_saldo_utilizado: 0, M_saldo_disponible: monto, M_tasa_interes: 0.32, F_emision: fecha, F_vencimiento: addMonths(fecha, 48), N_dia_corte: 15, N_dia_pago: 30, D_estado: estado };
    } else if (tipo === 11) {
      table = 'Leasing';
      idColumn = 'C_leasing';
      payload = { C_cliente: idCliente, D_num_contrato: `LEA${Date.now().toString().slice(-6)}`, D_desc_bien: 'Bien financiado', C_moneda: moneda, M_valor_bien: monto, M_saldo_pendiente: monto, M_cuota_mensual: monto / plazoMeses, M_tasa_interes: tasa, Q_plazo_meses: plazoMeses, F_inicio: fecha, F_fin: addMonths(fecha, plazoMeses), M_valor_residual: monto * 0.10, D_estado: estado };
    } else if (tipo === 12) {
      table = 'AvalGarantia';
      idColumn = 'C_aval';
      payload = { C_cliente: idCliente, D_num_documento: `AVL${Date.now().toString().slice(-6)}`, T_tipo_garantia: 'Garantia bancaria', D_beneficiario: 'Beneficiario general', C_moneda: moneda, M_monto_garantizado: monto, F_emision: fecha, F_vencimiento: addMonths(fecha, plazoMeses), D_estado: estado };
    } else if ([13, 14].includes(tipo)) {
      table = 'Transferencia';
      idColumn = 'C_transferencia';
      payload = { C_cliente: idCliente, C_tipo_producto: tipo, D_num_referencia: `TRF${Date.now().toString().slice(-6)}`, C_moneda: moneda, M_monto: monto, T_tipo_canal: 'Web', D_banco_origen: 'Banco origen', D_banco_destino: 'Banco destino', F_transaccion: new Date(fecha), M_comision_cobrada: 0, D_estado: estado };
    } else if (tipo === 15) {
      table = 'OperacionDivisas';
      idColumn = 'C_operacion';
      payload = { C_cliente: idCliente, T_tipo_operacion: 'Compra', C_moneda_origen: moneda, M_monto_origen: monto, C_moneda_destino: 2, M_monto_destino: monto / 520, M_tipo_cambio: 520, F_operacion: new Date(fecha), M_comision_cobrada: 0, M_ganancia_entidad: 0 };
    } else if (tipo === 16) {
      table = 'Fideicomiso';
      idColumn = 'C_fideicomiso';
      payload = { C_cliente: idCliente, D_num_contrato: `FID${Date.now().toString().slice(-6)}`, D_objeto: 'Administracion patrimonial', C_moneda: moneda, M_valor_aportado: monto, M_valor_actual: monto, D_beneficiario: 'Beneficiario general', F_constitucion: fecha, D_estado: estado };
    } else if (tipo === 17) {
      const cuentaRes = await db.query('SELECT TOP 1 C_cuenta FROM dbo.Cuenta WHERE C_cliente = @cliente ORDER BY C_cuenta;', [
        { name: 'cliente', type: sql.Int, value: idCliente },
      ]);
      const cuenta = cuentaRes.recordset[0]?.C_cuenta;
      if (!cuenta) return res.status(400).json({ error: 'Se requiere una cuenta existente para registrar uso ATM.' });
      table = 'UsoATM';
      idColumn = 'C_uso_atm';
      payload = { C_cliente: idCliente, C_cuenta: cuenta, D_codigo_atm: `ATM${Date.now().toString().slice(-4)}`, D_ubicacion_atm: 'Sucursal central', C_moneda: moneda, M_monto: monto, T_tipo_operacion: 'Retiro', M_comision_cobrada: 0, M_ganancia_entidad: 0, F_operacion: new Date(fecha) };
    } else if (tipo === 18) {
      table = 'BancaEnLinea';
      idColumn = 'C_operacion_bl';
      payload = { C_cliente: idCliente, T_canal: 'App movil', D_tipo_operacion: 'Pago servicio', C_moneda: moneda, M_monto: monto, D_descripcion: 'Operacion de banca en linea', F_operacion: new Date(fecha), D_ip_origen: '127.0.0.1', D_estado: estado };
    } else if (tipo === 19) {
      table = 'CajaSeguridad';
      idColumn = 'C_caja';
      payload = { C_cliente: idCliente, D_numero_caja: `CAJ${Date.now().toString().slice(-4)}`, D_sucursal: 'Sucursal central', D_dimensiones: '30x30x50', M_canon_mensual: monto, F_inicio: fecha, D_estado: estado };
    } else {
      return res.status(400).json({ error: `Tipo de producto no soportado: ${tipo}` });
    }

    await insertRecord(table, idColumn, payload);
    const result = await db.query(SELECT_PRODUCTOS, [
      { name: 'limite', type: sql.Int, value: 1000 },
      { name: 'cliente', type: sql.Int, value: null },
    ]);

    const creado = result.recordset
      .filter((p) => Number(p.tipo_producto) === tipo)
      .sort((a, b) => Number(b.id_producto) - Number(a.id_producto))[0] || result.recordset[0];

    res.status(201).json({
      data: creado,
      message: 'Producto creado correctamente',
    });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', (req, res) => {
  res.status(501).json({ error: 'Actualizacion de producto generico no implementada; edita desde la seccion especifica si aplica.' });
});

router.delete('/:id', (req, res) => {
  res.status(501).json({ error: 'Eliminacion de producto generico no implementada; elimina desde la seccion especifica si aplica.' });
});

module.exports = router;
