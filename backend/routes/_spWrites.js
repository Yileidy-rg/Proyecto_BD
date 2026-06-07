const db = require('../db');
const sql = db.sql;

function normalizePayload(payload) {
  return Object.fromEntries(
    Object.entries(payload)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => {
        if (typeof value === 'boolean') return [key, value ? 1 : 0];
        return [key, value];
      })
  );
}

function mapSpError(err) {
  if ([51005, 51006].includes(err.number)) err.status = 404;
  if ([51001, 51003, 51004].includes(err.number)) err.status = 400;
  return err;
}

async function insertRecord(table, idColumn, payload) {
  const json = JSON.stringify(normalizePayload(payload));
  try {
    const result = await db.query(`
      DECLARE @id INT;
      EXEC dbo.sp_InsertarRegistroFinanciero
        @T_tabla = @tabla,
        @C_id_columna = @idColumn,
        @D_payload = @payload,
        @N_id_generado = @id OUTPUT;
      SELECT @id AS id;
    `, [
      { name: 'tabla', type: sql.NVarChar(128), value: table },
      { name: 'idColumn', type: sql.NVarChar(128), value: idColumn },
      { name: 'payload', type: sql.NVarChar(sql.MAX), value: json },
    ]);
    return result.recordset[0]?.id;
  } catch (err) {
    throw mapSpError(err);
  }
}

async function updateRecord(table, idColumn, id, payload) {
  const json = JSON.stringify(normalizePayload(payload));
  try {
    await db.query(`
      EXEC dbo.sp_ActualizarRegistroFinanciero
        @T_tabla = @tabla,
        @C_id_columna = @idColumn,
        @N_id = @id,
        @D_payload = @payload;
    `, [
      { name: 'tabla', type: sql.NVarChar(128), value: table },
      { name: 'idColumn', type: sql.NVarChar(128), value: idColumn },
      { name: 'id', type: sql.Int, value: parseInt(id, 10) },
      { name: 'payload', type: sql.NVarChar(sql.MAX), value: json },
    ]);
  } catch (err) {
    throw mapSpError(err);
  }
}

async function deleteRecord(table, idColumn, id) {
  try {
    await db.query(`
      EXEC dbo.sp_EliminarRegistroFinanciero
        @T_tabla = @tabla,
        @C_id_columna = @idColumn,
        @N_id = @id;
    `, [
      { name: 'tabla', type: sql.NVarChar(128), value: table },
      { name: 'idColumn', type: sql.NVarChar(128), value: idColumn },
      { name: 'id', type: sql.Int, value: parseInt(id, 10) },
    ]);
  } catch (err) {
    throw mapSpError(err);
  }
}

module.exports = { insertRecord, updateRecord, deleteRecord };
