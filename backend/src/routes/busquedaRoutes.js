import { Router } from 'express';
import { getPool, sql } from '../config/db.js';

const router = Router();

router.get('/clientes', async (req, res, next) => {
  try {
    const texto = (req.query.texto || '').toLowerCase().trim();

    // DATO QUEMADO TEMPORAL PARA PROBAR LA BÚSQUEDA
    const clientePrueba = {
      ClienteID: 1,
      Identificacion: '12345',
      NombreCompleto: 'Reychell Acuña',
      TipoCliente: 'Físico',
      Provincia: 'Puntarenas',
      Canton: 'Golfito',
      Distrito: 'Golfito',
      Relevancia: 100
    };

    // Si busca Reychell, Acuña o 12345, devuelve el dato quemado
    if (
      texto.includes('reychell') ||
      texto.includes('acuña') ||
      texto.includes('acuna') ||
      texto.includes('12345')
    ) {
      return res.json([clientePrueba]);
    }

    // Si no coincide con el dato quemado, busca en SQL Server
    const pool = await getPool();

    const result = await pool.request()
      .input('Texto', sql.NVarChar(150), req.query.texto || '')
      .input('ProvinciaID', sql.Int, req.query.provinciaId ? Number(req.query.provinciaId) : null)
      .input('CantonID', sql.Int, req.query.cantonId ? Number(req.query.cantonId) : null)
      .input('DistritoID', sql.Int, req.query.distritoId ? Number(req.query.distritoId) : null)
      .execute('sp_BuscarClientesInteligente');

    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
});

export default router;