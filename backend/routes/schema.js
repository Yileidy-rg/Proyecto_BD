const express = require('express');
const router = express.Router();
const db = require('../db');
const { handleValidation, param } = require('./_validation');

// GET /api/schema/tables
router.get('/tables', async (req, res, next) => {
  try {
    const result = await db.listTables();
    res.json({ data: result.recordset, total: result.recordset.length });
  } catch (err) {
    next(err);
  }
});

// GET /api/schema/columns/:table
router.get('/columns/:table', [
  param('table')
    .trim()
    .notEmpty()
    .withMessage('table es requerido')
    .bail()
    .matches(/^[A-Za-z0-9_]+$/)
    .withMessage('table solo puede contener letras, numeros y guion bajo'),
  handleValidation,
], async (req, res, next) => {
  try {
    const result = await db.listColumns(req.params.table);
    res.json({
      table: req.params.table,
      columns: result.recordset,
      total: result.recordset.length,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
