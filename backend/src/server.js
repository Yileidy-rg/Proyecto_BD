import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crudRoutes from './routes/crudRoutes.js';
import riesgoRoutes from './routes/riesgoRoutes.js';
import busquedaRoutes from './routes/busquedaRoutes.js';
import xmlRoutes from './routes/xmlRoutes.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/crud', crudRoutes);
app.use('/api/riesgo', riesgoRoutes);
app.use('/api/busqueda', busquedaRoutes);
app.use('/api/xml', xmlRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: err.message || 'Error interno' });
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`API lista en puerto ${port}`));
