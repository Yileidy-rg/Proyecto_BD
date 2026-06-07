const express = require('express');
const db = require('../db');
const sql = db.sql;
const { insertRecord, updateRecord, deleteRecord } = require('./_spWrites');

const TYPE_MAP = {
  int: sql.Int,
  bigint: sql.BigInt,
  smallint: sql.SmallInt,
  tinyint: sql.TinyInt,
  bit: sql.Bit,
  decimal: sql.Decimal(18, 4),
  money: sql.Money,
  float: sql.Float,
  date: sql.Date,
  datetime: sql.DateTime,
  nvarchar: sql.NVarChar(sql.MAX),
  varchar: sql.VarChar(sql.MAX),
  char: sql.Char,
};

function coerce(value, column) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;

  if (['int', 'bigint', 'smallint', 'tinyint'].includes(column.type)) {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (['decimal', 'money', 'float'].includes(column.type)) {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (column.type === 'bit') return Boolean(value);
  return value;
}

function bind(req, name, column, value) {
  const type = TYPE_MAP[column.type] || sql.NVarChar(sql.MAX);
  req.input(name, type, coerce(value, column));
}

function pickPayload(body, columns, options = {}) {
  const payload = {};
  for (const column of columns) {
    if (column.name === options.idColumn) continue;
    const value = body[column.name] !== undefined ? body[column.name] : body[column.alias];
    if (value !== undefined) payload[column.name] = value;
  }
  return payload;
}

function applyDefaults(payload, columns, defaults = {}) {
  const next = { ...payload };
  for (const column of columns) {
    if (next[column.name] !== undefined) continue;
    if (defaults[column.name] !== undefined) {
      next[column.name] = typeof defaults[column.name] === 'function'
        ? defaults[column.name](next)
        : defaults[column.name];
    }
  }
  return next;
}

function assertRequired(payload, columns, idColumn) {
  const missing = columns
    .filter(column => column.required && column.name !== idColumn)
    .filter(column => payload[column.name] === undefined || payload[column.name] === null || payload[column.name] === '')
    .map(column => column.alias || column.name);

  if (missing.length) {
    const err = new Error(`Campos requeridos: ${missing.join(', ')}`);
    err.status = 400;
    throw err;
  }
}

function selectList(columns) {
  return columns
    .map(column => `${column.name} AS ${column.alias || column.name}`)
    .join(',\n        ');
}

function createFinancialCrudRouter(config) {
  const router = express.Router();
  const {
    table,
    idColumn,
    idAlias = idColumn,
    columns,
    orderBy = idColumn,
    defaults = {},
    maxIdLock = true,
  } = config;

  const selectSql = `
    SELECT
        ${selectList(columns)}
    FROM dbo.${table}
  `;

  const idMeta = columns.find(column => column.name === idColumn) || { type: 'int' };

  router.get('/', async (req, res, next) => {
    try {
      const result = await db.query(`${selectSql} ORDER BY ${orderBy};`);
      res.json({ data: result.recordset, total: result.recordset.length });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const result = await db.query(`${selectSql} WHERE ${idColumn} = @id;`, [
        { name: 'id', type: TYPE_MAP[idMeta.type] || sql.Int, value: coerce(req.params.id, idMeta) },
      ]);

      if (!result.recordset.length) return res.status(404).json({ error: 'Registro no encontrado' });
      res.json({ data: result.recordset[0] });
    } catch (err) {
      next(err);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const payload = applyDefaults(pickPayload(req.body, columns, { idColumn }), columns, defaults);
      assertRequired(payload, columns, idColumn);

      const spPayload = {};
      for (const column of columns) {
        if (column.name === idColumn || payload[column.name] === undefined) continue;
        spPayload[column.name] = coerce(payload[column.name], column);
      }

      const id = await insertRecord(table, idColumn, spPayload);
      const result = await db.query(`${selectSql} WHERE ${idColumn} = @id;`, [
        { name: 'id', type: TYPE_MAP[idMeta.type] || sql.Int, value: id },
      ]);
      res.status(201).json({ data: result.recordset[0], message: 'Registro creado' });
    } catch (err) {
      next(err);
    }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const payload = pickPayload(req.body, columns, { idColumn });
      const updateColumns = columns.filter(column => column.name !== idColumn && payload[column.name] !== undefined);

      if (!updateColumns.length) {
        return res.status(400).json({ error: 'No hay campos para actualizar' });
      }

      const spPayload = {};
      for (const column of updateColumns) spPayload[column.name] = coerce(payload[column.name], column);

      await updateRecord(table, idColumn, req.params.id, spPayload);

      const result = await db.query(`${selectSql} WHERE ${idColumn} = @id;`, [
        { name: 'id', type: TYPE_MAP[idMeta.type] || sql.Int, value: coerce(req.params.id, idMeta) },
      ]);

      if (!result.recordset.length) {
        return res.status(404).json({ error: 'Registro no encontrado' });
      }

      res.json({ data: result.recordset[0], message: 'Registro actualizado' });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      await deleteRecord(table, idColumn, req.params.id);
      res.json({ data: { [idAlias]: parseInt(req.params.id, 10) }, message: 'Registro eliminado' });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createFinancialCrudRouter };
