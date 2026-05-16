import { getPool, sql } from '../config/db.js';

export async function calcularRiesgo(clienteId) {
  const pool = await getPool();
  const result = await pool.request()
    .input('ClienteID', sql.Int, Number(clienteId))
    .execute('sp_CalcularRiesgoCliente');
  return result.recordset?.[0] || { ok: true };
}
