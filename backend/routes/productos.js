const express = require('express');
const router = express.Router();
const db = require('../db');
const sql = db.sql;
const { insertRecord } = require('./_spWrites');
const {
  handleValidation,
  idParam,
  optionalDateBody,
  optionalIdBody,
  optionalIntBody,
  optionalIntQuery,
  optionalMoneyBody,
  optionalNonEmptyBody,
  requiredIdBody,
  body,
} = require('./_validation');

const SELECT_PRODUCTOS = `
  SELECT TOP (@limite) *
  FROM dbo.vw_api_productos p
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
      SELECT *
      FROM dbo.vw_api_tipos_producto
      ORDER BY value;
    `);
    res.json({ data: result.recordset, total: result.recordset.length });
  } catch (err) {
    next(err);
  }
});

router.get('/', [
  optionalIntQuery('limite', { min: 1, max: 1000 }),
  optionalIntQuery('cliente', { min: 1 }),
  optionalIntQuery('id_cliente', { min: 1 }),
  handleValidation,
], async (req, res, next) => {
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

router.get('/cliente/:idCliente', [idParam('idCliente'), handleValidation], async (req, res, next) => {
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

router.get('/:id', [idParam(), handleValidation], async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT *
      FROM dbo.vw_api_productos q
      WHERE q.id_producto = @id;
    `, [
      { name: 'id', type: sql.Int, value: parseInt(req.params.id, 10) },
    ]);
    if (!result.recordset.length) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
});

router.post('/', [
  requiredIdBody('id_cliente'),
  requiredIdBody('tipo_producto'),
  optionalIdBody('moneda'),
  optionalDateBody('fecha_apertura'),
  optionalNonEmptyBody('estado', { max: 40 }),
  body().custom((_, { req }) => {
    const values = [req.body.monto, req.body.saldo, req.body.limite_credito]
      .filter((value) => value !== undefined && value !== null && value !== '');
    if (!values.length) throw new Error('monto, saldo o limite_credito es requerido');
    if (!values.some((value) => Number(value) > 0)) throw new Error('monto, saldo o limite_credito debe ser mayor a cero');
    return true;
  }),
  optionalMoneyBody('monto', { min: 0 }),
  optionalMoneyBody('saldo', { min: 0 }),
  optionalMoneyBody('limite_credito', { min: 0 }),
  optionalIntBody('plazo_meses', { min: 1, max: 600 }),
  optionalIntBody('plazo_dias', { min: 1, max: 36500 }),
  optionalMoneyBody('tasa_interes', { min: 0 }),
  handleValidation,
], async (req, res, next) => {
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
