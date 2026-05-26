/**
 * db/index.js — SQL Azure / SQL Server
 * Con prueba de conexión al arrancar y manejo defensivo de errores
 */
require('dotenv').config();
const sql = require('mssql');

const config = {
  server:   process.env.DB_SERVER   || 'rey.database.windows.net',
  database: process.env.DB_DATABASE || 'Grupo5_IF51002026',
  user:     process.env.DB_USER     || 'CloudSAaed262d2',
  password: process.env.DB_PASSWORD || 'Rey12345',
  port:     parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt:                true,
    trustServerCertificate: false,
    enableArithAbort:       true,
    connectTimeout:         30000,
    requestTimeout:         30000,
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
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
    console.log(`SQL Azure conectado → ${config.server} / ${config.database}`);
    // Listar tablas para verificar nombres reales
    const r = await p.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);
    console.log('📋 Tablas disponibles:', r.recordset.map(t => t.TABLE_NAME).join(', '));
  } catch (err) {
    console.error('Error de conexión SQL Azure:', err.message);
    console.error('   Verifica: servidor, usuario, contraseña y reglas de firewall en Azure Portal');
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

  searchClientes: async (q, cedula, nombre, provincia, canton, distrito, limit = 20) => {
    const p = await getPool();
    const req = p.request();
    const conds = [];

    if (q) {
      req.input('q', sql.NVarChar, `%${q}%`);
      conds.push(`(
        CAST(cedula           AS NVARCHAR(50))  COLLATE Latin1_General_CI_AI LIKE @q OR
        CAST(nombre           AS NVARCHAR(200)) COLLATE Latin1_General_CI_AI LIKE @q OR
        CAST(primer_apellido  AS NVARCHAR(200)) COLLATE Latin1_General_CI_AI LIKE @q OR
        CAST(segundo_apellido AS NVARCHAR(200)) COLLATE Latin1_General_CI_AI LIKE @q OR
        CAST(email            AS NVARCHAR(200)) COLLATE Latin1_General_CI_AI LIKE @q
      )`);
    }
    if (cedula) { req.input('ced', sql.NVarChar, `%${cedula}%`); conds.push(`CAST(cedula AS NVARCHAR(50)) LIKE @ced`); }
    if (nombre) { req.input('nom', sql.NVarChar, `%${nombre}%`); conds.push(`(nombre COLLATE Latin1_General_CI_AI LIKE @nom OR primer_apellido COLLATE Latin1_General_CI_AI LIKE @nom)`); }
    if (provincia) { req.input('prov', sql.Int, parseInt(provincia)); conds.push(`id_provincia = @prov`); }
    if (canton)    { req.input('cant', sql.Int, parseInt(canton));    conds.push(`id_canton = @cant`); }
    if (distrito)  { req.input('dist', sql.Int, parseInt(distrito));  conds.push(`id_distrito = @dist`); }

    req.input('lim', sql.Int, parseInt(limit));
    const where   = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const orderBy = q ? `ORDER BY CASE WHEN cedula COLLATE Latin1_General_CI_AI LIKE @q THEN 0 ELSE 1 END` : `ORDER BY id_cliente`;

    return req.query(`SELECT TOP (@lim) * FROM dbo.CLIENTE ${where} ${orderBy}`);
  },
};

module.exports = db;
