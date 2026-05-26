const express = require('express');
const router = express.Router();
const db = require('../db');
const sql = db.sql;

// GET /api/riesgo — historial de calificaciones guardadas por el SP
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(`
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
      LEFT JOIN dbo.cat_NivelRiesgo nr ON nr.N_nivel_riesgo = cr.C_nivel_riesgo
      ORDER BY cr.F_calificacion DESC, cr.C_calificacion DESC;
    `);

    res.json({ data: result.recordset, total: result.recordset.length });
  } catch (err) {
    next(err);
  }
});

// GET /api/riesgo/:idCliente — ejecuta el procedimiento almacenado real de la base
router.get('/:idCliente', async (req, res, next) => {
  try {
    const idCliente = parseInt(req.params.idCliente, 10);
    if (!Number.isInteger(idCliente)) {
      return res.status(400).json({ error: 'ID de cliente inválido' });
    }

    const periodo = req.query.periodo || new Date().toISOString().slice(0, 7);

    const result = await db.query(`
      EXEC dbo.sp_CalificarRiesgoCliente
        @C_cliente = @idCliente,
        @D_periodo = @periodo;
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
router.post('/recalcular-todos', async (req, res, next) => {
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
