/**
 * routes/clientes.js
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { sql } = db;

const SELECT_CLIENTES = `
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
    D_cod_actividad AS actividad_economica,
    C_justificacion_ingreso AS justificacion_ingreso,
    M_ingreso_mensual AS ingreso_mensual,
    B_es_pep AS es_pep,
    B_es_sujeto_obligado AS es_sujeto_obligado,
    B_es_residente AS es_residente,
    F_vinculacion AS fecha_vinculacion,
    D_estado_cliente AS estado
  FROM dbo.Cliente
`;

// ── 2. GET /api/clientes/buscar/inteligente?termino=... ───────────────────────
router.get('/buscar/inteligente', async (req, res, next) => {
  try {
    const { termino = null, limite = 10 } = req.query;

    if (!termino || termino.length < 2) {
      return res.json({ data: [], total: 0 });
    }

    const palabras = termino.trim().split(/\s+/).filter(Boolean);
    const p1 = palabras[0] || null;
    const p2 = palabras[1] || null;
    const p3 = palabras[2] || null;

    const result = await db.query(`
      SELECT TOP (@limite)
        C_cliente,
        D_numero_identificacion,
        D_nombre_1,
        D_nombre_2,
        D_apellido_1,
        D_apellido_2,
        CONCAT(
          TRIM(ISNULL(D_nombre_1,'')), ' ',
          TRIM(ISNULL(D_nombre_2,'')), ' ',
          TRIM(ISNULL(D_apellido_1,'')), ' ',
          TRIM(ISNULL(D_apellido_2,''))
        ) AS D_nombre_completo,
        'Física' AS T_tipo_persona,
        D_estado_cliente
      FROM dbo.Cliente
      WHERE
        -- 3 palabras: nombre + apellido1 + apellido2
        (@p3 IS NOT NULL AND
          D_nombre_1   LIKE @p1 + '%' AND
          D_apellido_1 LIKE @p2 + '%' AND
          D_apellido_2 LIKE @p3 + '%'
        )
        OR
        -- 2 palabras: nombre + apellido1
        (@p2 IS NOT NULL AND @p3 IS NULL AND
          D_nombre_1   LIKE @p1 + '%' AND
          (D_apellido_1 LIKE @p2 + '%' OR D_apellido_2 LIKE @p2 + '%')
        )
        OR
        -- 1 palabra: busca en todo
        (@p2 IS NULL AND (
          D_nombre_1             LIKE @p1 + '%'
          OR D_apellido_1        LIKE @p1 + '%'
          OR D_apellido_2        LIKE @p1 + '%'
          OR D_numero_identificacion LIKE @p1 + '%'
        ))
      ORDER BY D_apellido_1, D_nombre_1
    `, [
      { name: 'p1',     type: sql.NVarChar(100), value: p1 },
      { name: 'p2',     type: sql.NVarChar(100), value: p2 },
      { name: 'p3',     type: sql.NVarChar(100), value: p3 },
      { name: 'limite', type: sql.Int,           value: Number(limite) || 10 },
    ]);

    res.json({ data: result.recordset, total: result.recordset.length });
  } catch (err) {
    next(err);
  }
});
// ── 3. GET /api/clientes ──────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(`${SELECT_CLIENTES} ORDER BY C_cliente;`);
    res.json({ data: result.recordset, total: result.recordset.length });
  } catch (err) {
    next(err);
  }
});

// ── 4. GET /api/clientes/:id  (SIEMPRE al final de los GET) ──────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(`${SELECT_CLIENTES} WHERE C_cliente = @id;`, [
      { name: 'id', type: sql.Int, value: parseInt(req.params.id) },
    ]);
    if (!result.recordset.length) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json({ data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
});

// ── 5. POST /api/clientes ─────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const {
      nombre, primer_apellido, segundo_apellido = null, cedula,
      email = null, telefono = null, fecha_nacimiento = null,
      tipo_cliente = 1, provincia = null, actividad_economica = null,
      justificacion_ingreso = null, ingreso_mensual = 0,
      es_pep = false, es_sujeto_obligado = false, es_residente = true,
    } = req.body;

    if (!nombre || !primer_apellido || !cedula) {
      return res.status(400).json({ error: 'Campos requeridos: nombre, primer_apellido, cedula' });
    }

    const result = await db.query(`
      DECLARE @id INT = ISNULL((SELECT MAX(C_cliente) FROM dbo.Cliente), 0) + 1;
      INSERT INTO dbo.Cliente (
        C_cliente, C_tipo_identificacion, D_numero_identificacion, C_tipo_persona,
        D_nombre_1, D_apellido_1, D_apellido_2, D_telefono, D_correo_electronico,
        F_nacimiento_const, C_provincia, D_cod_actividad, C_justificacion_ingreso,
        M_ingreso_mensual, B_es_pep, B_es_sujeto_obligado, B_es_residente,
        F_vinculacion, D_estado_cliente
      )
      OUTPUT
        INSERTED.C_cliente AS id_cliente, INSERTED.D_numero_identificacion AS cedula,
        INSERTED.C_tipo_persona AS tipo_cliente, INSERTED.D_nombre_1 AS nombre,
        INSERTED.D_apellido_1 AS primer_apellido, INSERTED.D_apellido_2 AS segundo_apellido,
        INSERTED.D_correo_electronico AS email, INSERTED.D_telefono AS telefono,
        INSERTED.F_nacimiento_const AS fecha_nacimiento, INSERTED.C_provincia AS provincia,
        INSERTED.D_cod_actividad AS actividad_economica,
        INSERTED.C_justificacion_ingreso AS justificacion_ingreso,
        INSERTED.M_ingreso_mensual AS ingreso_mensual, INSERTED.B_es_pep AS es_pep,
        INSERTED.B_es_sujeto_obligado AS es_sujeto_obligado,
        INSERTED.B_es_residente AS es_residente, INSERTED.D_estado_cliente AS estado
      VALUES (
        @id, 1, @cedula, @tipo_cliente, @nombre, @primer_apellido, @segundo_apellido,
        @telefono, @email, @fecha_nacimiento, @provincia, @actividad_economica,
        @justificacion_ingreso, @ingreso_mensual, @es_pep, @es_sujeto_obligado,
        @es_residente, GETDATE(), 'Activo'
      );
    `, [
      { name: 'cedula',               type: sql.NVarChar(50),    value: cedula },
      { name: 'tipo_cliente',         type: sql.TinyInt,         value: parseInt(tipo_cliente) || 1 },
      { name: 'nombre',               type: sql.NVarChar(60),    value: nombre },
      { name: 'primer_apellido',      type: sql.NVarChar(60),    value: primer_apellido },
      { name: 'segundo_apellido',     type: sql.NVarChar(60),    value: segundo_apellido || null },
      { name: 'telefono',             type: sql.NVarChar(20),    value: telefono || null },
      { name: 'email',                type: sql.NVarChar(120),   value: email || null },
      { name: 'fecha_nacimiento',     type: sql.Date,            value: fecha_nacimiento || null },
      { name: 'provincia',            type: sql.TinyInt,         value: provincia ? parseInt(provincia) : null },
      { name: 'actividad_economica',  type: sql.NVarChar(20),    value: actividad_economica || null },
      { name: 'justificacion_ingreso',type: sql.TinyInt,         value: justificacion_ingreso ? parseInt(justificacion_ingreso) : null },
      { name: 'ingreso_mensual',      type: sql.Decimal(15, 2),  value: Number(ingreso_mensual || 0) },
      { name: 'es_pep',               type: sql.Bit,             value: Boolean(es_pep) },
      { name: 'es_sujeto_obligado',   type: sql.Bit,             value: Boolean(es_sujeto_obligado) },
      { name: 'es_residente',         type: sql.Bit,             value: Boolean(es_residente) },
    ]);

    res.status(201).json({ data: result.recordset[0], message: 'Cliente creado exitosamente' });
  } catch (err) {
    next(err);
  }
});

// ── 6. PUT /api/clientes/:id ──────────────────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const {
      nombre, primer_apellido, segundo_apellido = null, cedula,
      email = null, telefono = null, fecha_nacimiento = null,
      tipo_cliente = 1, provincia = null, actividad_economica = null,
      justificacion_ingreso = null, ingreso_mensual = 0,
      es_pep = false, es_sujeto_obligado = false, es_residente = true,
    } = req.body;

    const result = await db.query(`
      UPDATE dbo.Cliente SET
        D_numero_identificacion  = COALESCE(@cedula, D_numero_identificacion),
        C_tipo_persona           = COALESCE(@tipo_cliente, C_tipo_persona),
        D_nombre_1               = COALESCE(@nombre, D_nombre_1),
        D_apellido_1             = COALESCE(@primer_apellido, D_apellido_1),
        D_apellido_2             = @segundo_apellido,
        D_telefono               = @telefono,
        D_correo_electronico     = @email,
        F_nacimiento_const       = @fecha_nacimiento,
        C_provincia              = @provincia,
        D_cod_actividad          = @actividad_economica,
        C_justificacion_ingreso  = @justificacion_ingreso,
        M_ingreso_mensual        = @ingreso_mensual,
        B_es_pep                 = @es_pep,
        B_es_sujeto_obligado     = @es_sujeto_obligado,
        B_es_residente           = @es_residente,
        F_modificacion           = GETDATE()
      OUTPUT
        INSERTED.C_cliente AS id_cliente, INSERTED.D_numero_identificacion AS cedula,
        INSERTED.C_tipo_persona AS tipo_cliente, INSERTED.D_nombre_1 AS nombre,
        INSERTED.D_apellido_1 AS primer_apellido, INSERTED.D_apellido_2 AS segundo_apellido,
        INSERTED.D_correo_electronico AS email, INSERTED.D_telefono AS telefono,
        INSERTED.F_nacimiento_const AS fecha_nacimiento, INSERTED.C_provincia AS provincia,
        INSERTED.D_cod_actividad AS actividad_economica,
        INSERTED.C_justificacion_ingreso AS justificacion_ingreso,
        INSERTED.M_ingreso_mensual AS ingreso_mensual, INSERTED.B_es_pep AS es_pep,
        INSERTED.B_es_sujeto_obligado AS es_sujeto_obligado,
        INSERTED.B_es_residente AS es_residente, INSERTED.D_estado_cliente AS estado
      WHERE C_cliente = @id;
    `, [
      { name: 'id',                   type: sql.Int,             value: parseInt(req.params.id) },
      { name: 'cedula',               type: sql.NVarChar(50),    value: cedula || null },
      { name: 'tipo_cliente',         type: sql.TinyInt,         value: parseInt(tipo_cliente) || 1 },
      { name: 'nombre',               type: sql.NVarChar(60),    value: nombre || null },
      { name: 'primer_apellido',      type: sql.NVarChar(60),    value: primer_apellido || null },
      { name: 'segundo_apellido',     type: sql.NVarChar(60),    value: segundo_apellido || null },
      { name: 'telefono',             type: sql.NVarChar(20),    value: telefono || null },
      { name: 'email',                type: sql.NVarChar(120),   value: email || null },
      { name: 'fecha_nacimiento',     type: sql.Date,            value: fecha_nacimiento || null },
      { name: 'provincia',            type: sql.TinyInt,         value: provincia ? parseInt(provincia) : null },
      { name: 'actividad_economica',  type: sql.NVarChar(20),    value: actividad_economica || null },
      { name: 'justificacion_ingreso',type: sql.TinyInt,         value: justificacion_ingreso ? parseInt(justificacion_ingreso) : null },
      { name: 'ingreso_mensual',      type: sql.Decimal(15, 2),  value: Number(ingreso_mensual || 0) },
      { name: 'es_pep',               type: sql.Bit,             value: Boolean(es_pep) },
      { name: 'es_sujeto_obligado',   type: sql.Bit,             value: Boolean(es_sujeto_obligado) },
      { name: 'es_residente',         type: sql.Bit,             value: Boolean(es_residente) },
    ]);

    if (!result.recordset.length) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json({ data: result.recordset[0], message: 'Cliente actualizado exitosamente' });
  } catch (err) {
    next(err);
  }
});

// ── 7. DELETE /api/clientes/:id ───────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await db.query(`
      DELETE FROM dbo.Cliente
      OUTPUT DELETED.C_cliente AS id_cliente
      WHERE C_cliente = @id;
    `, [
      { name: 'id', type: sql.Int, value: parseInt(req.params.id) },
    ]);

    if (!result.recordset.length) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json({ message: 'Cliente eliminado exitosamente' });
  } catch (err) {
    if (err.message?.includes('REFERENCE constraint')) {
      return res.status(409).json({
        error: 'No se puede eliminar el cliente porque tiene productos, cuentas, transacciones o riesgo asociados.',
      });
    }
    next(err);
  }
});

module.exports = router;
