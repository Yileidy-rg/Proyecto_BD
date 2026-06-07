const express = require('express');
const router = express.Router();
const db = require('../db');
const sql = db.sql;

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

    const params = [
      { name: 'cliente', type: sql.Int, value: idCliente },
      { name: 'tipo', type: sql.TinyInt, value: tipo },
      { name: 'moneda', type: sql.TinyInt, value: moneda },
      { name: 'fecha', type: sql.Date, value: fecha },
      { name: 'estado', type: sql.NVarChar(20), value: estado },
      { name: 'monto', type: sql.Decimal(18, 2), value: monto },
      { name: 'plazoMeses', type: sql.Int, value: plazoMeses },
      { name: 'plazoDias', type: sql.Int, value: plazoDias },
      { name: 'tasa', type: sql.Decimal(8, 4), value: tasa },
    ];

    let insertSql = '';

    if ([1, 3, 4].includes(tipo)) {
      insertSql = `
        DECLARE @id INT = ISNULL((SELECT MAX(C_cuenta) FROM dbo.Cuenta WITH (UPDLOCK, HOLDLOCK)), 0) + 1;
        INSERT INTO dbo.Cuenta (C_cuenta, C_cliente, C_tipo_producto, D_numero_cuenta, C_moneda, M_saldo_disponible, M_saldo_contable, F_apertura, D_estado)
        VALUES (@id, @cliente, @tipo, CONCAT('CTA', FORMAT(@id, '0000000000')), @moneda, @monto, @monto, @fecha, @estado);
      `;
    } else if (tipo === 2) {
      insertSql = `
        DECLARE @id INT = ISNULL((SELECT MAX(C_deposito) FROM dbo.DepositoPlazo WITH (UPDLOCK, HOLDLOCK)), 0) + 1;
        INSERT INTO dbo.DepositoPlazo (C_deposito, C_cliente, D_numero_cert, C_moneda, M_monto_principal, M_tasa_interes, Q_plazo_dias, F_emision, F_vencimiento, D_estado)
        VALUES (@id, @cliente, CONCAT('DP', FORMAT(@id, '000000')), @moneda, @monto, @tasa, @plazoDias, @fecha, DATEADD(DAY, @plazoDias, @fecha), @estado);
      `;
    } else if (tipo === 5) {
      insertSql = `
        DECLARE @id INT = ISNULL((SELECT MAX(C_dep_judicial) FROM dbo.DepositoJudicial WITH (UPDLOCK, HOLDLOCK)), 0) + 1;
        INSERT INTO dbo.DepositoJudicial (C_dep_judicial, C_cliente, D_num_expediente, D_tribunal_origen, C_moneda, M_monto, F_deposito, D_estado)
        VALUES (@id, @cliente, CONCAT('EXP', FORMAT(@id, '000000')), 'Tribunal Central', @moneda, @monto, @fecha, @estado);
      `;
    } else if ([6, 7, 9, 10].includes(tipo)) {
      insertSql = `
        DECLARE @id INT = ISNULL((SELECT MAX(C_credito) FROM dbo.Credito WITH (UPDLOCK, HOLDLOCK)), 0) + 1;
        INSERT INTO dbo.Credito (C_credito, C_cliente, C_tipo_producto, D_num_operacion, C_moneda,
          M_monto_aprobado, M_saldo_principal, M_tasa_interes, Q_plazo_meses, F_formalizacion, F_vencimiento, M_cuota_mensual, Q_dias_mora, D_estado)
        VALUES (@id, @cliente, @tipo, CONCAT('CRD', FORMAT(@id, '000000')), @moneda,
          @monto, @monto, @tasa, @plazoMeses, @fecha, DATEADD(MONTH, @plazoMeses, @fecha), @monto / NULLIF(@plazoMeses, 0), 0, @estado);
      `;
    } else if (tipo === 8) {
      insertSql = `
        DECLARE @id INT = ISNULL((SELECT MAX(C_tarjeta) FROM dbo.TarjetaCredito WITH (UPDLOCK, HOLDLOCK)), 0) + 1;
        INSERT INTO dbo.TarjetaCredito (C_tarjeta, C_cliente, D_num_tarjeta, C_moneda, M_limite_credito,
          M_saldo_utilizado, M_saldo_disponible, M_tasa_interes, F_emision, F_vencimiento, N_dia_corte, N_dia_pago, D_estado)
        VALUES (@id, @cliente, CONCAT('411111111111', FORMAT(@id, '0000')), @moneda, @monto,
          0, @monto, 0.3200, @fecha, DATEADD(YEAR, 4, @fecha), 15, 30, @estado);
      `;
    } else if (tipo === 11) {
      insertSql = `
        DECLARE @id INT = ISNULL((SELECT MAX(C_leasing) FROM dbo.Leasing WITH (UPDLOCK, HOLDLOCK)), 0) + 1;
        INSERT INTO dbo.Leasing (C_leasing, C_cliente, D_num_contrato, D_desc_bien, C_moneda, M_valor_bien,
          M_saldo_pendiente, M_cuota_mensual, M_tasa_interes, Q_plazo_meses, F_inicio, F_fin, M_valor_residual, D_estado)
        VALUES (@id, @cliente, CONCAT('LEA', FORMAT(@id, '000000')), 'Bien financiado', @moneda, @monto,
          @monto, @monto / NULLIF(@plazoMeses, 0), @tasa, @plazoMeses, @fecha, DATEADD(MONTH, @plazoMeses, @fecha), @monto * 0.10, @estado);
      `;
    } else if (tipo === 12) {
      insertSql = `
        DECLARE @id INT = ISNULL((SELECT MAX(C_aval) FROM dbo.AvalGarantia WITH (UPDLOCK, HOLDLOCK)), 0) + 1;
        INSERT INTO dbo.AvalGarantia (C_aval, C_cliente, D_num_documento, T_tipo_garantia, D_beneficiario, C_moneda, M_monto_garantizado, F_emision, F_vencimiento, D_estado)
        VALUES (@id, @cliente, CONCAT('AVL', FORMAT(@id, '000000')), 'Garantia bancaria', 'Beneficiario general', @moneda, @monto, @fecha, DATEADD(MONTH, @plazoMeses, @fecha), @estado);
      `;
    } else if ([13, 14].includes(tipo)) {
      insertSql = `
        DECLARE @id INT = ISNULL((SELECT MAX(C_transferencia) FROM dbo.Transferencia WITH (UPDLOCK, HOLDLOCK)), 0) + 1;
        INSERT INTO dbo.Transferencia (C_transferencia, C_cliente, C_tipo_producto, D_num_referencia, C_moneda, M_monto, T_tipo_canal, D_banco_origen, D_banco_destino, F_transaccion, M_comision_cobrada, D_estado)
        VALUES (@id, @cliente, @tipo, CONCAT('TRF', FORMAT(@id, '000000')), @moneda, @monto, 'Web', 'Banco origen', 'Banco destino', @fecha, 0, @estado);
      `;
    } else if (tipo === 15) {
      insertSql = `
        DECLARE @id INT = ISNULL((SELECT MAX(C_operacion) FROM dbo.OperacionDivisas WITH (UPDLOCK, HOLDLOCK)), 0) + 1;
        INSERT INTO dbo.OperacionDivisas (C_operacion, C_cliente, T_tipo_operacion, C_moneda_origen, M_monto_origen, C_moneda_destino, M_monto_destino, M_tipo_cambio, F_operacion, M_comision_cobrada, M_ganancia_entidad)
        VALUES (@id, @cliente, 'Compra', @moneda, @monto, 2, @monto / 520.00, 520.00, @fecha, 0, 0);
      `;
    } else if (tipo === 16) {
      insertSql = `
        DECLARE @id INT = ISNULL((SELECT MAX(C_fideicomiso) FROM dbo.Fideicomiso WITH (UPDLOCK, HOLDLOCK)), 0) + 1;
        INSERT INTO dbo.Fideicomiso (C_fideicomiso, C_cliente, D_num_contrato, D_objeto, C_moneda, M_valor_aportado, M_valor_actual, D_beneficiario, F_constitucion, D_estado)
        VALUES (@id, @cliente, CONCAT('FID', FORMAT(@id, '000000')), 'Administracion patrimonial', @moneda, @monto, @monto, 'Beneficiario general', @fecha, @estado);
      `;
    } else if (tipo === 17) {
      insertSql = `
        DECLARE @id INT = ISNULL((SELECT MAX(C_uso_atm) FROM dbo.UsoATM WITH (UPDLOCK, HOLDLOCK)), 0) + 1;
        DECLARE @cuenta INT = (SELECT TOP 1 C_cuenta FROM dbo.Cuenta WHERE C_cliente = @cliente ORDER BY C_cuenta);
        IF @cuenta IS NULL SELECT TOP 1 @cuenta = C_cuenta FROM dbo.Cuenta ORDER BY C_cuenta;
        IF @cuenta IS NULL THROW 51000, 'Se requiere una cuenta existente para registrar uso ATM.', 1;
        INSERT INTO dbo.UsoATM (C_uso_atm, C_cliente, C_cuenta, D_codigo_atm, D_ubicacion_atm, C_moneda, M_monto, T_tipo_operacion, M_comision_cobrada, M_ganancia_entidad, F_operacion)
        VALUES (@id, @cliente, @cuenta, CONCAT('ATM', FORMAT(@id, '0000')), 'Sucursal central', @moneda, @monto, 'Retiro', 0, 0, @fecha);
      `;
    } else if (tipo === 18) {
      insertSql = `
        DECLARE @id INT = ISNULL((SELECT MAX(C_operacion_bl) FROM dbo.BancaEnLinea WITH (UPDLOCK, HOLDLOCK)), 0) + 1;
        INSERT INTO dbo.BancaEnLinea (C_operacion_bl, C_cliente, T_canal, D_tipo_operacion, C_moneda, M_monto, D_descripcion, F_operacion, D_ip_origen, D_estado)
        VALUES (@id, @cliente, 'App movil', 'Pago servicio', @moneda, @monto, 'Operacion de banca en linea', @fecha, '127.0.0.1', @estado);
      `;
    } else if (tipo === 19) {
      insertSql = `
        DECLARE @id INT = ISNULL((SELECT MAX(C_caja) FROM dbo.CajaSeguridad WITH (UPDLOCK, HOLDLOCK)), 0) + 1;
        INSERT INTO dbo.CajaSeguridad (C_caja, C_cliente, D_numero_caja, D_sucursal, D_dimensiones, M_canon_mensual, F_inicio, D_estado)
        VALUES (@id, @cliente, CONCAT('CAJ', FORMAT(@id, '0000')), 'Sucursal central', '30x30x50', @monto, @fecha, @estado);
      `;
    } else {
      return res.status(400).json({ error: `Tipo de producto no soportado: ${tipo}` });
    }

    const result = await db.query(`
      BEGIN TRAN;
      ${insertSql}
      COMMIT;
      ${SELECT_PRODUCTOS}
    `, [
      ...params,
      { name: 'limite', type: sql.Int, value: 1000 },
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
