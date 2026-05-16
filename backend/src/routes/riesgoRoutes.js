import { Router } from 'express';
import { calcularRiesgo } from '../services/riesgoService.js';

const router = Router();

router.post('/clientes/:clienteId/calcular', async (req, res, next) => {
  try { res.json(await calcularRiesgo(req.params.clienteId)); } catch (err) { next(err); }
});

export default router;
