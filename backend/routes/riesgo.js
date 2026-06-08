const express = require('express');
const router = express.Router();
const db = require('../db');
const sql = db.sql;
const {
  body,
  handleValidation,
  idParam,
  query,
} = require('./_validation');

// GET /api/riesgo — historial de calificaciones guardadas por el SP
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT *
      FROM dbo.vw_api_riesgo_historial
      ORDER BY fecha_evaluacion DESC, id_evaluacion DESC;
    `);

    res.json({ data: result.recordset, total: result.recordset.length });
  } catch (err) {
    next(err);
  }
});

// GET /api/riesgo/:idCliente — ejecuta el procedimiento almacenado real de la base
router.get('/:idCliente', [
  idParam('idCliente'),
  query('periodo')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^\d{4}-(0[1-9]|1[0-2])$/)
    .withMessage('periodo debe tener formato YYYY-MM'),
  handleValidation,
], async (req, res, next) => {
  try {
    const idCliente = parseInt(req.params.idCliente, 10);
    if (!Number.isInteger(idCliente)) {
      return res.status(400).json({ error: 'ID de cliente inválido' });
    }

    const periodo = req.query.periodo || new Date().toISOString().slice(0, 7);

    const result = await db.query(`
      SELECT *
      FROM dbo.fn_api_riesgo_cliente(@idCliente, @periodo);
    `, [
      { name: 'idCliente', type: sql.Int, value: idCliente },
      { name: 'periodo', type: sql.Char(7), value: periodo }
    ]);

    const row = result.recordset?.[0];
    if (!row) {
      return res.status(404).json({ error: 'Cliente no encontrado o el SP no devolvió resultado' });
    }

    res.json({
      data: {
        id_cliente: idCliente,
        cedula: row.D_numero_identificacion,
        nombre: row.D_nombre,
        puntaje_total: Number(row.M_puntaje_total),
        nivel_riesgo: row.D_nivel_riesgo,
        periodo
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/riesgo/recalcular-todos — ejecuta el SP masivo
router.post('/recalcular-todos', [
  body('periodo')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^\d{4}-(0[1-9]|1[0-2])$/)
    .withMessage('periodo debe tener formato YYYY-MM'),
  handleValidation,
], async (req, res, next) => {
  try {
    const periodo = req.body?.periodo || new Date().toISOString().slice(0, 7);

    const result = await db.query(`
      EXEC dbo.sp_CalificarRiesgoTodos @D_periodo = @periodo;
    `, [
      { name: 'periodo', type: sql.Char(7), value: periodo }
    ]);

    res.json({
      message: 'Calificación masiva ejecutada',
      periodo,
      data: result.recordset || []
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
