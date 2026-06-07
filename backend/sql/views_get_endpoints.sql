/*
  Vistas para operaciones GET de la API.
  Ejecutar en Grupo2_IF51002026 antes de usar las rutas refactorizadas.
*/

CREATE OR ALTER VIEW dbo.vw_api_clientes
AS
SELECT
  C_cliente AS id_cliente,
  D_numero_identificacion AS cedula,
  C_tipo_persona AS tipo_cliente,
  D_nombre_1 AS nombre,
  D_nombre_2 AS segundo_nombre,
  D_apellido_1 AS primer_apellido,
  D_apellido_2 AS segundo_apellido,
  D_correo_electronico AS email,
  D_telefono AS telefono,
  F_nacimiento_const AS fecha_nacimiento,
  C_provincia AS provincia,
  C_canton AS canton,
  C_distrito AS distrito,
  D_cod_actividad AS actividad_economica,
  C_justificacion_ingreso AS justificacion_ingreso,
  M_ingreso_mensual AS ingreso_mensual,
  B_es_pep AS es_pep,
  B_es_sujeto_obligado AS es_sujeto_obligado,
  B_es_residente AS es_residente,
  F_vinculacion AS fecha_vinculacion,
  D_estado_cliente AS estado
FROM dbo.Cliente;
GO

CREATE OR ALTER VIEW dbo.vw_api_clientes_busqueda
AS
SELECT
  c.C_cliente,
  c.D_numero_identificacion,
  c.D_nombre_1,
  c.D_nombre_2,
  c.D_apellido_1,
  c.D_apellido_2,
  COALESCE(NULLIF(LTRIM(RTRIM(CONCAT(
    COALESCE(c.D_nombre_1, ''),
    CASE WHEN c.D_nombre_2 IS NULL OR c.D_nombre_2 = '' THEN '' ELSE CONCAT(' ', c.D_nombre_2) END,
    CASE WHEN c.D_apellido_1 IS NULL OR c.D_apellido_1 = '' THEN '' ELSE CONCAT(' ', c.D_apellido_1) END,
    CASE WHEN c.D_apellido_2 IS NULL OR c.D_apellido_2 = '' THEN '' ELSE CONCAT(' ', c.D_apellido_2) END
  ))), ''), c.D_nombre_juridico) AS D_nombre_completo,
  CASE c.C_tipo_persona
    WHEN 1 THEN 'Fisico'
    WHEN 2 THEN 'Juridico'
    ELSE CONCAT('Tipo ', c.C_tipo_persona)
  END AS T_tipo_persona,
  c.D_correo_electronico,
  c.D_telefono,
  c.F_nacimiento_const,
  c.C_tipo_persona,
  c.C_provincia,
  c.C_canton,
  c.C_distrito,
  c.D_cod_actividad,
  c.C_justificacion_ingreso,
  c.M_ingreso_mensual,
  c.B_es_pep,
  c.B_es_sujeto_obligado,
  c.B_es_residente,
  c.D_estado_cliente,
  pr.D_descripcion AS D_provincia,
  ca.D_descripcion AS D_canton,
  di.D_descripcion AS D_distrito
FROM dbo.Cliente c
LEFT JOIN dbo.cat_Provincia pr ON pr.N_provincia = c.C_provincia
LEFT JOIN dbo.cat_Canton ca ON ca.N_canton = c.C_canton AND ca.C_provincia = c.C_provincia
LEFT JOIN dbo.cat_Distrito di ON di.N_distrito = c.C_distrito AND di.C_canton = c.C_canton;
GO

CREATE OR ALTER VIEW dbo.vw_api_tipos_producto
AS
SELECT
  N_tipo_producto AS value,
  D_descripcion AS label,
  C_tipo_operacion AS tipo_operacion
FROM dbo.cat_TipoProducto;
GO

CREATE OR ALTER VIEW dbo.vw_api_productos
AS
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
SELECT dp.C_deposito, dp.C_cliente, 2, tp.D_descripcion, dp.C_moneda, dp.F_emision, UPPER(dp.D_estado), CONCAT('Deposito a plazo ', dp.D_numero_cert), 'DepositoPlazo'
FROM dbo.DepositoPlazo dp
LEFT JOIN dbo.cat_TipoProducto tp ON tp.N_tipo_producto = 2
UNION ALL
SELECT dj.C_dep_judicial, dj.C_cliente, 5, tp.D_descripcion, dj.C_moneda, dj.F_deposito, UPPER(dj.D_estado), CONCAT('Deposito judicial ', dj.D_num_expediente), 'DepositoJudicial'
FROM dbo.DepositoJudicial dj
LEFT JOIN dbo.cat_TipoProducto tp ON tp.N_tipo_producto = 5
UNION ALL
SELECT cr.C_credito, cr.C_cliente, cr.C_tipo_producto, tp.D_descripcion, cr.C_moneda, cr.F_formalizacion, UPPER(cr.D_estado), CONCAT('Credito ', cr.D_num_operacion), 'Credito'
FROM dbo.Credito cr
LEFT JOIN dbo.cat_TipoProducto tp ON tp.N_tipo_producto = cr.C_tipo_producto
UNION ALL
SELECT tc.C_tarjeta, tc.C_cliente, 8, tp.D_descripcion, tc.C_moneda, tc.F_emision, UPPER(tc.D_estado), CONCAT('Tarjeta ', tc.D_num_tarjeta), 'TarjetaCredito'
FROM dbo.TarjetaCredito tc
LEFT JOIN dbo.cat_TipoProducto tp ON tp.N_tipo_producto = 8
UNION ALL
SELECT l.C_leasing, l.C_cliente, 11, tp.D_descripcion, l.C_moneda, l.F_inicio, UPPER(l.D_estado), CONCAT('Leasing ', l.D_num_contrato), 'Leasing'
FROM dbo.Leasing l
LEFT JOIN dbo.cat_TipoProducto tp ON tp.N_tipo_producto = 11
UNION ALL
SELECT a.C_aval, a.C_cliente, 12, tp.D_descripcion, a.C_moneda, a.F_emision, UPPER(a.D_estado), CONCAT('Aval ', a.D_num_documento), 'AvalGarantia'
FROM dbo.AvalGarantia a
LEFT JOIN dbo.cat_TipoProducto tp ON tp.N_tipo_producto = 12
UNION ALL
SELECT t.C_transferencia, t.C_cliente, t.C_tipo_producto, tp.D_descripcion, t.C_moneda, CAST(t.F_transaccion AS date), UPPER(t.D_estado), CONCAT('Transferencia ', t.D_num_referencia), 'Transferencia'
FROM dbo.Transferencia t
LEFT JOIN dbo.cat_TipoProducto tp ON tp.N_tipo_producto = t.C_tipo_producto
UNION ALL
SELECT od.C_operacion, od.C_cliente, 15, tp.D_descripcion, od.C_moneda_origen, CAST(od.F_operacion AS date), 'ACTIVA', CONCAT('Divisas ', od.T_tipo_operacion), 'OperacionDivisas'
FROM dbo.OperacionDivisas od
LEFT JOIN dbo.cat_TipoProducto tp ON tp.N_tipo_producto = 15
UNION ALL
SELECT f.C_fideicomiso, f.C_cliente, 16, tp.D_descripcion, f.C_moneda, f.F_constitucion, UPPER(f.D_estado), CONCAT('Fideicomiso ', f.D_num_contrato), 'Fideicomiso'
FROM dbo.Fideicomiso f
LEFT JOIN dbo.cat_TipoProducto tp ON tp.N_tipo_producto = 16
UNION ALL
SELECT atm.C_uso_atm, atm.C_cliente, 17, tp.D_descripcion, atm.C_moneda, CAST(atm.F_operacion AS date), 'ACTIVA', CONCAT('ATM ', atm.D_codigo_atm), 'UsoATM'
FROM dbo.UsoATM atm
LEFT JOIN dbo.cat_TipoProducto tp ON tp.N_tipo_producto = 17
UNION ALL
SELECT bl.C_operacion_bl, bl.C_cliente, 18, tp.D_descripcion, ISNULL(bl.C_moneda, 1), CAST(bl.F_operacion AS date), UPPER(bl.D_estado), CONCAT('Banca en linea ', bl.D_tipo_operacion), 'BancaEnLinea'
FROM dbo.BancaEnLinea bl
LEFT JOIN dbo.cat_TipoProducto tp ON tp.N_tipo_producto = 18
UNION ALL
SELECT cs.C_caja, cs.C_cliente, 19, tp.D_descripcion, 1, cs.F_inicio, UPPER(cs.D_estado), CONCAT('Caja seguridad ', cs.D_numero_caja), 'CajaSeguridad'
FROM dbo.CajaSeguridad cs
LEFT JOIN dbo.cat_TipoProducto tp ON tp.N_tipo_producto = 19;
GO

CREATE OR ALTER VIEW dbo.vw_api_cuentas
AS
SELECT
  C_cuenta AS id_cuenta,
  C_tipo_producto AS id_producto,
  C_tipo_producto AS tipo_cuenta,
  D_numero_cuenta AS numero_cuenta,
  M_saldo_disponible AS saldo,
  D_estado AS estado
FROM dbo.Cuenta;
GO

CREATE OR ALTER VIEW dbo.vw_api_creditos
AS
SELECT
  C_credito AS id_prestamo,
  C_tipo_producto AS id_producto,
  C_tipo_producto AS tipo_prestamo,
  M_monto_aprobado AS monto,
  Q_plazo_meses AS plazo_meses,
  M_tasa_interes AS tasa_interes,
  F_formalizacion AS fecha_desembolso,
  D_estado AS estado
FROM dbo.Credito;
GO

CREATE OR ALTER VIEW dbo.vw_api_tarjetas
AS
SELECT
  C_tarjeta AS id_tarjeta,
  8 AS id_producto,
  8 AS tipo_tarjeta,
  D_num_tarjeta AS numero_tarjeta,
  M_limite_credito AS limite_credito,
  M_saldo_utilizado AS saldo_actual,
  D_estado AS estado
FROM dbo.TarjetaCredito;
GO

CREATE OR ALTER VIEW dbo.vw_api_transacciones
AS
SELECT
  t.N_id_transaccion AS id_transaccion,
  COALESCE(t.N_cuenta, t.N_credito, t.N_tarjeta, t.N_deposito_plazo, t.N_leasing, t.N_transferencia) AS id_producto,
  t.N_cuenta,
  t.N_credito,
  t.N_tarjeta,
  t.N_deposito_plazo,
  t.N_leasing,
  t.N_transferencia,
  tt.D_descripcion AS tipo_transaccion,
  t.M_monto AS monto,
  t.D_descripcion AS descripcion,
  t.F_transaccion AS fecha,
  t.C_cliente AS id_cliente,
  t.C_tipo_producto AS tipo_producto
FROM dbo.Transaccion t
LEFT JOIN dbo.cat_TipoTransaccion tt ON tt.N_tipo_transaccion = t.C_tipo_transaccion;
GO

CREATE OR ALTER VIEW dbo.vw_api_riesgo_historial
AS
SELECT
  cr.C_calificacion AS id_evaluacion,
  cr.C_cliente AS id_cliente,
  c.D_numero_identificacion AS cedula,
  COALESCE(c.D_nombre_juridico,
    CONCAT(TRIM(ISNULL(c.D_nombre_1, '')), ' ', TRIM(ISNULL(c.D_apellido_1, '')))
  ) AS nombre,
  CASE WHEN cr.C_tipo_persona = 2 THEN 'JURIDICO' ELSE 'FISICO' END AS tipo_cliente,
  cr.M_puntaje_total AS puntaje_total,
  UPPER(nr.D_descripcion) AS nivel_riesgo,
  cr.D_periodo AS periodo,
  cr.F_calificacion AS fecha_evaluacion
FROM dbo.CalificacionRiesgo cr
INNER JOIN dbo.Cliente c ON c.C_cliente = cr.C_cliente
LEFT JOIN dbo.cat_NivelRiesgo nr ON nr.N_nivel_riesgo = cr.C_nivel_riesgo;
GO

CREATE OR ALTER FUNCTION dbo.fn_api_riesgo_cliente
(
  @C_cliente INT,
  @D_periodo CHAR(7) = NULL
)
RETURNS TABLE
AS
RETURN
(
  SELECT TOP (1)
    c.D_numero_identificacion,
    COALESCE(c.D_nombre_juridico,
      CONCAT(TRIM(ISNULL(c.D_nombre_1, '')), ' ', TRIM(ISNULL(c.D_apellido_1, '')))
    ) AS D_nombre,
    cr.M_puntaje_total,
    UPPER(nr.D_descripcion) AS D_nivel_riesgo,
    cr.D_periodo
  FROM dbo.CalificacionRiesgo cr
  INNER JOIN dbo.Cliente c ON c.C_cliente = cr.C_cliente
  LEFT JOIN dbo.cat_NivelRiesgo nr ON nr.N_nivel_riesgo = cr.C_nivel_riesgo
  WHERE cr.C_cliente = @C_cliente
    AND (@D_periodo IS NULL OR cr.D_periodo = @D_periodo)
  ORDER BY cr.F_calificacion DESC, cr.C_calificacion DESC
);
GO
