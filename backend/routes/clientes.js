/**
 * routes/clientes.js
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { sql } = db;
const { insertRecord, updateRecord, deleteRecord } = require('./_spWrites');

const SELECT_CLIENTES = `
  SELECT *
  FROM dbo.vw_api_clientes
`;

const SELECT_BUSQUEDA_CLIENTES = `
  SELECT TOP (@limite)
    *
  FROM dbo.vw_api_clientes_busqueda c
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
        OR c.D_nombre_completo COLLATE Latin1_General_CI_AI LIKE @firstTokenStart
      )
    `;
    const extraTokenWhere = extraTokenParams.map(({ name }) => `
      c.D_nombre_completo COLLATE Latin1_General_CI_AI LIKE @${name}
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
          c.D_provincia COLLATE Latin1_General_CI_AI LIKE @startsWith
          OR c.D_canton COLLATE Latin1_General_CI_AI LIKE @startsWith
          OR c.D_distrito COLLATE Latin1_General_CI_AI LIKE @startsWith
        ORDER BY
          CASE
            WHEN c.D_provincia COLLATE Latin1_General_CI_AI LIKE @startsWith THEN 0
            WHEN c.D_canton COLLATE Latin1_General_CI_AI LIKE @startsWith THEN 1
            WHEN c.D_distrito COLLATE Latin1_General_CI_AI LIKE @startsWith THEN 2
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
    const result = await db.query(`${SELECT_CLIENTES} ORDER BY id_cliente;`);
    res.json({ data: result.recordset, total: result.recordset.length });
  } catch (err) {
    next(err);
  }
});

// GET /api/clientes/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(`${SELECT_CLIENTES} WHERE id_cliente = @id;`, [
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

    const id = await insertRecord('Cliente', 'C_cliente', {
      C_tipo_identificacion: 1,
      D_numero_identificacion: cedula,
      C_tipo_persona: parseInt(tipo_cliente, 10) || 1,
      D_nombre_1: nombre,
      D_apellido_1: primer_apellido,
      D_apellido_2: segundo_apellido || null,
      D_telefono: telefono || null,
      D_correo_electronico: email || null,
      F_nacimiento_const: fecha_nacimiento || null,
      C_provincia: provincia ? parseInt(provincia, 10) : null,
      C_canton: canton ? parseInt(canton, 10) : null,
      C_distrito: distrito ? parseInt(distrito, 10) : null,
      D_cod_actividad: actividad_economica || null,
      C_justificacion_ingreso: justificacion_ingreso ? parseInt(justificacion_ingreso, 10) : null,
      M_ingreso_mensual: Number(ingreso_mensual || 0),
      B_es_pep: Boolean(es_pep),
      B_es_sujeto_obligado: Boolean(es_sujeto_obligado),
      B_es_residente: Boolean(es_residente),
      F_vinculacion: new Date(),
      D_estado_cliente: 'Activo',
    });

    const result = await db.query(`${SELECT_CLIENTES} WHERE id_cliente = @id;`, [
      { name: 'id', type: sql.Int, value: id },
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
    const payload = { F_modificacion: new Date() };
    if (req.body.cedula !== undefined) payload.D_numero_identificacion = req.body.cedula || null;
    if (req.body.tipo_cliente !== undefined) payload.C_tipo_persona = parseInt(req.body.tipo_cliente, 10) || 1;
    if (req.body.nombre !== undefined) payload.D_nombre_1 = req.body.nombre || null;
    if (req.body.primer_apellido !== undefined) payload.D_apellido_1 = req.body.primer_apellido || null;
    if (req.body.segundo_apellido !== undefined) payload.D_apellido_2 = req.body.segundo_apellido || null;
    if (req.body.telefono !== undefined) payload.D_telefono = req.body.telefono || null;
    if (req.body.email !== undefined) payload.D_correo_electronico = req.body.email || null;
    if (req.body.fecha_nacimiento !== undefined) payload.F_nacimiento_const = req.body.fecha_nacimiento || null;
    if (req.body.provincia !== undefined) payload.C_provincia = req.body.provincia ? parseInt(req.body.provincia, 10) : null;
    if (req.body.canton !== undefined) payload.C_canton = req.body.canton ? parseInt(req.body.canton, 10) : null;
    if (req.body.distrito !== undefined) payload.C_distrito = req.body.distrito ? parseInt(req.body.distrito, 10) : null;
    if (req.body.actividad_economica !== undefined) payload.D_cod_actividad = req.body.actividad_economica || null;
    if (req.body.justificacion_ingreso !== undefined) payload.C_justificacion_ingreso = req.body.justificacion_ingreso ? parseInt(req.body.justificacion_ingreso, 10) : null;
    if (req.body.ingreso_mensual !== undefined) payload.M_ingreso_mensual = Number(req.body.ingreso_mensual || 0);
    if (req.body.es_pep !== undefined) payload.B_es_pep = Boolean(req.body.es_pep);
    if (req.body.es_sujeto_obligado !== undefined) payload.B_es_sujeto_obligado = Boolean(req.body.es_sujeto_obligado);
    if (req.body.es_residente !== undefined) payload.B_es_residente = Boolean(req.body.es_residente);

    await updateRecord('Cliente', 'C_cliente', req.params.id, payload);

    const result = await db.query(`${SELECT_CLIENTES} WHERE id_cliente = @id;`, [
      { name: 'id', type: sql.Int, value: parseInt(req.params.id, 10) },
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
    await deleteRecord('Cliente', 'C_cliente', req.params.id);

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
