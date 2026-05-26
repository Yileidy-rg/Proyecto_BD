/**
 * routes/schema.js — Inspección del esquema real de SQL Azure
 * GET /api/schema/tables        → lista todas las tablas
 * GET /api/schema/columns/:table → columnas de una tabla
 * Útil para depurar diferencias entre el .bak y la BD en Azure
 */
const express = require('express');
const router  = express.Router();
const db      = require('../db');

router.get('/tables', async (req, res, next) => {
  try {
    const r = await db.getTables();
    res.json({ data: r.recordset });
  } catch (err) { next(err); }
});

router.get('/columns/:table', async (req, res, next) => {
  try {
    const r = await db.getTableColumns(req.params.table);
    res.json({ table: req.params.table, columns: r.recordset });
  } catch (err) { next(err); }
});

module.exports = router;
