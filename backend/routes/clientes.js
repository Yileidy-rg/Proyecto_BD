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
  FROM dbo.Cliente
`;

const SELECT_BUSQUEDA_CLIENTES = `
  SELECT TOP (@limite)
    c.C_cliente,
    c.D_numero_identificacion,
    c.D_nombre_1,
    c.D_nombre_2,
    c.D_apellido_1,
    c.D_apellido_2,
    fn.D_nombre_completo,
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
  LEFT JOIN dbo.cat_Distrito di ON di.N_distrito = c.C_distrito AND di.C_canton = c.C_canton
  CROSS APPLY (
    SELECT COALESCE(NULLIF(LTRIM(RTRIM(CONCAT(
      COALESCE(c.D_nombre_1, ''),
      CASE WHEN c.D_nombre_2 IS NULL OR c.D_nombre_2 = '' THEN '' ELSE CONCAT(' ', c.D_nombre_2) END,
      CASE WHEN c.D_apellido_1 IS NULL OR c.D_apellido_1 = '' THEN '' ELSE CONCAT(' ', c.D_apellido_1) END,
      CASE WHEN c.D_apellido_2 IS NULL OR c.D_apellido_2 = '' THEN '' ELSE CONCAT(' ', c.D_apellido_2) END
    ))), ''), c.D_nombre_juridico) AS D_nombre_completo
  ) fn
`;

// GET /api/clientes/buscar/inteligente?termino=...
router.get('/buscar/inteligente', async (req, res, next) => {
  try {
    const terminoRaw = req.query.termino || '';
    const limite = Math.min(Math.max(Number(req.query.limite) || 20, 1), 20);
    const termino = terminoRaw.trim();

    if (!termino) {
      return res.json({ data: [], total: 0 });
    }

    const esCedula = /^\d+$/.test(termino);
    const like = `%${termino}%`;
    const startsWith = `${termino}%`;
    const tokens = termino.split(/\s+/).filter(Boolean).slice(0, 6);
    const firstTokenStart = `${tokens[0]}%`;
    const extraTokenParams = tokens.slice(1).map((token, index) => ({
      name: `token${index}Contains`,
      type: sql.NVarChar(120),
      value: `%${token}%`,
    }));
    const firstTokenWhere = `
      (
        c.D_nombre_1 COLLATE Latin1_General_CI_AI LIKE @firstTokenStart
        OR c.D_nombre_2 COLLATE Latin1_General_CI_AI LIKE @firstTokenStart
        OR c.D_apellido_1 COLLATE Latin1_General_CI_AI LIKE @firstTokenStart
        OR c.D_apellido_2 COLLATE Latin1_General_CI_AI LIKE @firstTokenStart
        OR c.D_nombre_juridico COLLATE Latin1_General_CI_AI LIKE @firstTokenStart
      )
    `;
    const extraTokenWhere = extraTokenParams.map(({ name }) => `
      fn.D_nombre_completo COLLATE Latin1_General_CI_AI LIKE @${name}
    `).join(' AND ');
    const tokenWhere = [firstTokenWhere, extraTokenWhere].filter(Boolean).join(' AND ');

    let result = await db.query(`
      ${SELECT_BUSQUEDA_CLIENTES}
      WHERE ${esCedula ? 'c.D_numero_identificacion LIKE @like' : tokenWhere}
      ORDER BY
        CASE
          WHEN c.D_numero_identificacion = @termino THEN 0
          WHEN c.D_nombre_1 COLLATE Latin1_General_CI_AI = @termino THEN 1
          WHEN c.D_nombre_1 COLLATE Latin1_General_CI_AI LIKE @startsWith THEN 2
          WHEN c.D_nombre_2 COLLATE Latin1_General_CI_AI LIKE @startsWith THEN 3
          WHEN c.D_apellido_1 COLLATE Latin1_General_CI_AI LIKE @startsWith THEN 4
          WHEN c.D_apellido_2 COLLATE Latin1_General_CI_AI LIKE @startsWith THEN 5
          WHEN c.D_numero_identificacion LIKE @startsWith THEN 6
          ELSE 7
        END,
        c.D_nombre_1,
        c.D_nombre_2,
        c.D_apellido_1,
        c.D_apellido_2,
        c.C_cliente;
    `, [
      { name: 'termino', type: sql.NVarChar(100), value: termino },
      { name: 'like', type: sql.NVarChar(120), value: like },
      { name: 'startsWith', type: sql.NVarChar(120), value: startsWith },
      { name: 'firstTokenStart', type: sql.NVarChar(120), value: firstTokenStart },
      { name: 'limite', type: sql.Int, value: limite },
      ...extraTokenParams,
    ]);

    if (!esCedula && result.recordset.length === 0) {
      result = await db.query(`
        ${SELECT_BUSQUEDA_CLIENTES}
        WHERE
          pr.D_descripcion COLLATE Latin1_General_CI_AI LIKE @startsWith
          OR ca.D_descripcion COLLATE Latin1_General_CI_AI LIKE @startsWith
          OR di.D_descripcion COLLATE Latin1_General_CI_AI LIKE @startsWith
        ORDER BY
          CASE
            WHEN pr.D_descripcion COLLATE Latin1_General_CI_AI LIKE @startsWith THEN 0
            WHEN ca.D_descripcion COLLATE Latin1_General_CI_AI LIKE @startsWith THEN 1
            WHEN di.D_descripcion COLLATE Latin1_General_CI_AI LIKE @startsWith THEN 2
            ELSE 3
          END,
          c.C_cliente;
      `, [
        { name: 'startsWith', type: sql.NVarChar(120), value: startsWith },
        { name: 'limite', type: sql.Int, value: limite },
      ]);
    }

    const data = result.recordset.map((c) => ({
      C_cliente: c.C_cliente,
      D_numero_identificacion: c.D_numero_identificacion,
      D_nombre_1: c.D_nombre_1,
      D_nombre_2: c.D_nombre_2 || '',
      D_apellido_1: c.D_apellido_1,
      D_apellido_2: c.D_apellido_2,
      D_nombre_completo: c.D_nombre_completo,
      T_tipo_persona: c.T_tipo_persona,
      D_correo_electronico: c.D_correo_electronico,
      D_telefono: c.D_telefono,
      F_nacimiento_const: c.F_nacimiento_const,
      C_tipo_persona: c.C_tipo_persona,
      C_provincia: c.C_provincia,
      C_canton: c.C_canton,
      C_distrito: c.C_distrito,
      D_cod_actividad: c.D_cod_actividad,
      C_justificacion_ingreso: c.C_justificacion_ingreso,
      M_ingreso_mensual: c.M_ingreso_mensual,
      B_es_pep: c.B_es_pep,
      B_es_sujeto_obligado: c.B_es_sujeto_obligado,
      B_es_residente: c.B_es_residente,
      D_provincia: c.D_provincia,
      D_canton: c.D_canton,
      D_distrito: c.D_distrito,
      D_estado_cliente: c.D_estado_cliente,
    }));

    res.json({ data, total: data.length });
  } catch (err) {
    next(err);
  }
});

// GET /api/clientes
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(`${SELECT_CLIENTES} ORDER BY C_cliente;`);
    res.json({ data: result.recordset, total: result.recordset.length });
  } catch (err) {
    next(err);
  }
});

// GET /api/clientes/:id
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

// POST /api/clientes
router.post('/', async (req, res, next) => {
  try {
    const {
      nombre,
      primer_apellido,
      segundo_apellido = null,
      cedula,
      email = null,
      telefono = null,
      fecha_nacimiento = null,
      tipo_cliente = 1,
      provincia = null,
      canton = null,
      distrito = null,
      actividad_economica = null,
      justificacion_ingreso = null,
      ingreso_mensual = 0,
      es_pep = false,
      es_sujeto_obligado = false,
      es_residente = true,
    } = req.body;

    if (!nombre || !primer_apellido || !cedula) {
      return res.status(400).json({
        error: 'Campos requeridos: nombre, primer_apellido, cedula',
      });
    }

    const result = await db.query(`
      DECLARE @id INT = ISNULL((SELECT MAX(C_cliente) FROM dbo.Cliente), 0) + 1;

      INSERT INTO dbo.Cliente (
        C_cliente,
        C_tipo_identificacion,
        D_numero_identificacion,
        C_tipo_persona,
        D_nombre_1,
        D_apellido_1,
        D_apellido_2,
        D_telefono,
        D_correo_electronico,
        F_nacimiento_const,
        C_provincia,
        C_canton,
        C_distrito,
        D_cod_actividad,
        C_justificacion_ingreso,
        M_ingreso_mensual,
        B_es_pep,
        B_es_sujeto_obligado,
        B_es_residente,
        F_vinculacion,
        D_estado_cliente
      )
      OUTPUT
        INSERTED.C_cliente AS id_cliente,
        INSERTED.D_numero_identificacion AS cedula,
        INSERTED.C_tipo_persona AS tipo_cliente,
        INSERTED.D_nombre_1 AS nombre,
        INSERTED.D_apellido_1 AS primer_apellido,
        INSERTED.D_apellido_2 AS segundo_apellido,
        INSERTED.D_correo_electronico AS email,
        INSERTED.D_telefono AS telefono,
        INSERTED.F_nacimiento_const AS fecha_nacimiento,
        INSERTED.C_provincia AS provincia,
        INSERTED.C_canton AS canton,
        INSERTED.C_distrito AS distrito,
        INSERTED.D_cod_actividad AS actividad_economica,
        INSERTED.C_justificacion_ingreso AS justificacion_ingreso,
        INSERTED.M_ingreso_mensual AS ingreso_mensual,
        INSERTED.B_es_pep AS es_pep,
        INSERTED.B_es_sujeto_obligado AS es_sujeto_obligado,
        INSERTED.B_es_residente AS es_residente,
        INSERTED.D_estado_cliente AS estado
      VALUES (
        @id,
        1,
        @cedula,
        @tipo_cliente,
        @nombre,
        @primer_apellido,
        @segundo_apellido,
        @telefono,
        @email,
        @fecha_nacimiento,
        @provincia,
        @canton,
        @distrito,
        @actividad_economica,
        @justificacion_ingreso,
        @ingreso_mensual,
        @es_pep,
        @es_sujeto_obligado,
        @es_residente,
        GETDATE(),
        'Activo'
      );
    `, [
      { name: 'cedula', type: sql.NVarChar(50), value: cedula },
      { name: 'tipo_cliente', type: sql.TinyInt, value: parseInt(tipo_cliente) || 1 },
      { name: 'nombre', type: sql.NVarChar(60), value: nombre },
      { name: 'primer_apellido', type: sql.NVarChar(60), value: primer_apellido },
      { name: 'segundo_apellido', type: sql.NVarChar(60), value: segundo_apellido || null },
      { name: 'telefono', type: sql.NVarChar(20), value: telefono || null },
      { name: 'email', type: sql.NVarChar(120), value: email || null },
      { name: 'fecha_nacimiento', type: sql.Date, value: fecha_nacimiento || null },
      { name: 'provincia', type: sql.TinyInt, value: provincia ? parseInt(provincia) : null },
      { name: 'canton', type: sql.SmallInt, value: canton ? parseInt(canton) : null },
      { name: 'distrito', type: sql.Int, value: distrito ? parseInt(distrito) : null },
      { name: 'actividad_economica', type: sql.NVarChar(20), value: actividad_economica || null },
      { name: 'justificacion_ingreso', type: sql.TinyInt, value: justificacion_ingreso ? parseInt(justificacion_ingreso) : null },
      { name: 'ingreso_mensual', type: sql.Decimal(15, 2), value: Number(ingreso_mensual || 0) },
      { name: 'es_pep', type: sql.Bit, value: Boolean(es_pep) },
      { name: 'es_sujeto_obligado', type: sql.Bit, value: Boolean(es_sujeto_obligado) },
      { name: 'es_residente', type: sql.Bit, value: Boolean(es_residente) },
    ]);

    res.status(201).json({
      data: result.recordset[0],
      message: 'Cliente creado exitosamente',
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/clientes/:id
router.put('/:id', async (req, res, next) => {
  try {
    const {
      nombre,
      primer_apellido,
      segundo_apellido = null,
      cedula,
      email = null,
      telefono = null,
      fecha_nacimiento = null,
      tipo_cliente = 1,
      provincia = null,
      canton = null,
      distrito = null,
      actividad_economica = null,
      justificacion_ingreso = null,
      ingreso_mensual = 0,
      es_pep = false,
      es_sujeto_obligado = false,
      es_residente = true,
    } = req.body;

    const result = await db.query(`
      UPDATE dbo.Cliente SET
        D_numero_identificacion = COALESCE(@cedula, D_numero_identificacion),
        C_tipo_persona = COALESCE(@tipo_cliente, C_tipo_persona),
        D_nombre_1 = COALESCE(@nombre, D_nombre_1),
        D_apellido_1 = COALESCE(@primer_apellido, D_apellido_1),
        D_apellido_2 = @segundo_apellido,
        D_telefono = @telefono,
        D_correo_electronico = @email,
        F_nacimiento_const = @fecha_nacimiento,
        C_provincia = @provincia,
        C_canton = @canton,
        C_distrito = @distrito,
        D_cod_actividad = @actividad_economica,
        C_justificacion_ingreso = @justificacion_ingreso,
        M_ingreso_mensual = @ingreso_mensual,
        B_es_pep = @es_pep,
        B_es_sujeto_obligado = @es_sujeto_obligado,
        B_es_residente = @es_residente,
        F_modificacion = GETDATE()
      OUTPUT
        INSERTED.C_cliente AS id_cliente,
        INSERTED.D_numero_identificacion AS cedula,
        INSERTED.C_tipo_persona AS tipo_cliente,
        INSERTED.D_nombre_1 AS nombre,
        INSERTED.D_apellido_1 AS primer_apellido,
        INSERTED.D_apellido_2 AS segundo_apellido,
        INSERTED.D_correo_electronico AS email,
        INSERTED.D_telefono AS telefono,
        INSERTED.F_nacimiento_const AS fecha_nacimiento,
        INSERTED.C_provincia AS provincia,
        INSERTED.C_canton AS canton,
        INSERTED.C_distrito AS distrito,
        INSERTED.D_cod_actividad AS actividad_economica,
        INSERTED.C_justificacion_ingreso AS justificacion_ingreso,
        INSERTED.M_ingreso_mensual AS ingreso_mensual,
        INSERTED.B_es_pep AS es_pep,
        INSERTED.B_es_sujeto_obligado AS es_sujeto_obligado,
        INSERTED.B_es_residente AS es_residente,
        INSERTED.D_estado_cliente AS estado
      WHERE C_cliente = @id;
    `, [
      { name: 'id', type: sql.Int, value: parseInt(req.params.id) },
      { name: 'cedula', type: sql.NVarChar(50), value: cedula || null },
      { name: 'tipo_cliente', type: sql.TinyInt, value: parseInt(tipo_cliente) || 1 },
      { name: 'nombre', type: sql.NVarChar(60), value: nombre || null },
      { name: 'primer_apellido', type: sql.NVarChar(60), value: primer_apellido || null },
      { name: 'segundo_apellido', type: sql.NVarChar(60), value: segundo_apellido || null },
      { name: 'telefono', type: sql.NVarChar(20), value: telefono || null },
      { name: 'email', type: sql.NVarChar(120), value: email || null },
      { name: 'fecha_nacimiento', type: sql.Date, value: fecha_nacimiento || null },
      { name: 'provincia', type: sql.TinyInt, value: provincia ? parseInt(provincia) : null },
      { name: 'canton', type: sql.SmallInt, value: canton ? parseInt(canton) : null },
      { name: 'distrito', type: sql.Int, value: distrito ? parseInt(distrito) : null },
      { name: 'actividad_economica', type: sql.NVarChar(20), value: actividad_economica || null },
      { name: 'justificacion_ingreso', type: sql.TinyInt, value: justificacion_ingreso ? parseInt(justificacion_ingreso) : null },
      { name: 'ingreso_mensual', type: sql.Decimal(15, 2), value: Number(ingreso_mensual || 0) },
      { name: 'es_pep', type: sql.Bit, value: Boolean(es_pep) },
      { name: 'es_sujeto_obligado', type: sql.Bit, value: Boolean(es_sujeto_obligado) },
      { name: 'es_residente', type: sql.Bit, value: Boolean(es_residente) },
    ]);

    if (!result.recordset.length) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json({
      data: result.recordset[0],
      message: 'Cliente actualizado exitosamente',
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/clientes/:id
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
