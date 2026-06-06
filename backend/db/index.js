/**
 * db/index.js — SQL Server
 * Con prueba de conexión al arrancar y manejo defensivo de errores
 */
require('dotenv').config();
const sql = require('mssql');

 const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '1433'),

  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },

  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool = null;

const getPool = async () => {
  if (pool) return pool;
  pool = await sql.connect(config);
  return pool;
};

// Prueba al arrancar el servidor — muestra tablas disponibles
const testConnection = async () => {
  try {
    const p = await getPool();
    console.log(`SQL Server conectado → ${config.server} / ${config.database}`);
    // Listar tablas para verificar nombres reales
    const r = await p.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);
    console.log('📋 Tablas disponibles:', r.recordset.map(t => t.TABLE_NAME).join(', '));
  } catch (err) {
    console.error('Error de conexión SQL Server:', err.message);
    console.error('   Verifica: servidor, usuario, contraseña y que SQL Server permita conexiones TCP/IP');
  }
};

testConnection();

// ── Helpers ───────────────────────────────────────────────────────────────────
const bindAll = (req, data) => {
  Object.entries(data).forEach(([k, v]) => {
    if (v === null || v === undefined) req.input(k, sql.NVarChar, null);
    else if (typeof v === 'number' && Number.isInteger(v)) req.input(k, sql.Int, v);
    else if (typeof v === 'number') req.input(k, sql.Float, v);
    else if (v instanceof Date) req.input(k, sql.DateTime, v);
    else req.input(k, sql.NVarChar(sql.MAX), String(v));
  });
};

const colList  = (data) => Object.keys(data).join(', ');
const paramList= (data) => Object.keys(data).map(k => `@${k}`).join(', ');
const setList  = (data) => Object.keys(data).map(k => `${k} = @${k}`).join(', ');

// ── API ───────────────────────────────────────────────────────────────────────
const db = {
  sql,

  // Listar tablas reales (útil para debug)
  listTables: async () => {
    const p = await getPool();
    return p.request().query(`
      SELECT TABLE_NAME, TABLE_SCHEMA
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);
  },

  // Listar columnas de una tabla (útil para debug)
  listColumns: async (table) => {
    const p = await getPool();
    return p.request()
      .input('tbl', sql.NVarChar, table)
      .query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = @tbl
        ORDER BY ORDINAL_POSITION
      `);
  },

  // Consulta libre
  query: async (sqlStr, params = []) => {
    const p = await getPool();
    const req = p.request();
    params.forEach(({ name, type, value }) =>
      type ? req.input(name, type, value) : req.input(name, value)
    );
    return req.query(sqlStr);
  },

  // Llamar función
  callFn: async (fnName, params = {}) => {
    const p = await getPool();
    const req = p.request();
    bindAll(req, params);
    const args = Object.keys(params).map(k => `@${k}`).join(', ');
    return req.query(`SELECT * FROM dbo.${fnName}(${args})`);
  },

  // Llamar SP
  callSP: async (spName, params = {}) => {
    const p = await getPool();
    const req = p.request();
    bindAll(req, params);
    return req.execute(`dbo.${spName}`);
  },

  getAll: async (table, orderBy = '') => {
    const p = await getPool();
    const order = orderBy ? ` ORDER BY ${orderBy}` : '';
    return p.request().query(`SELECT * FROM dbo.${table}${order}`);
  },

  getById: async (table, idField, id) => {
    const p = await getPool();
    return p.request()
      .input('__id', sql.Int, parseInt(id))
      .query(`SELECT * FROM dbo.${table} WHERE ${idField} = @__id`);
  },

  insert: async (table, data) => {
    const p = await getPool();
    const req = p.request();
    bindAll(req, data);
    return req.query(
      `INSERT INTO dbo.${table} (${colList(data)}) OUTPUT INSERTED.* VALUES (${paramList(data)})`
    );
  },

  update: async (table, idField, id, data) => {
    const p = await getPool();
    const req = p.request();
    req.input('__id', sql.Int, parseInt(id));
    bindAll(req, data);
    return req.query(
      `UPDATE dbo.${table} SET ${setList(data)} OUTPUT INSERTED.* WHERE ${idField} = @__id`
    );
  },

  delete: async (table, idField, id) => {
    const p = await getPool();
    return p.request()
      .input('__id', sql.Int, parseInt(id))
      .query(`DELETE FROM dbo.${table} WHERE ${idField} = @__id`);
  },
searchClientes: async (q, limit = 20) => {
  const p = await getPool();
  const req = p.request();

  req.input('q', sql.NVarChar, `${q}%`);
  req.input('lim', sql.Int, limit);

  return req.query(`
    SELECT TOP (@lim)
      C_cliente,
      D_numero_identificacion,
      D_nombre_1,
      D_apellido_1,
      D_apellido_2
    FROM Cliente
    WHERE
      D_nombre_1 LIKE @q
      OR D_apellido_1 LIKE @q
      OR D_apellido_2 LIKE @q
      OR D_numero_identificacion LIKE @q
    ORDER BY D_nombre_1
  `);
  },
};

module.exports = db;
