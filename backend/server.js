require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');

const clienteRoutes     = require('./routes/clientes');
const productoRoutes    = require('./routes/productos');
const cuentaRoutes      = require('./routes/cuentas');
const prestamoRoutes    = require('./routes/prestamos');
const tarjetaRoutes     = require('./routes/tarjetas');
const transaccionRoutes = require('./routes/transacciones');
const riesgoRoutes      = require('./routes/riesgo');
const escenarioRoutes   = require('./routes/escenarios');
const xmlRoutes         = require('./routes/xml');

const app = express();

app.use(helmet());
app.use(cors({ origin: '*' }));   // permite cualquier origen en dev
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/clientes',      clienteRoutes);
app.use('/api/productos',     productoRoutes);
app.use('/api/cuentas',       cuentaRoutes);
app.use('/api/prestamos',     prestamoRoutes);
app.use('/api/tarjetas',      tarjetaRoutes);
app.use('/api/transacciones', transaccionRoutes);
app.use('/api/riesgo',        riesgoRoutes);
app.use('/api/escenarios',    escenarioRoutes);
app.use('/api/xml',           xmlRoutes);

// ── Debug: listar tablas y columnas reales ────────────────────────────────────
app.get('/api/debug/tablas', async (req, res) => {
  try {
    const db = require('./db');
    const r  = await db.listTables();
    res.json({ tablas: r.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/debug/columnas/:tabla', async (req, res) => {
  try {
    const db = require('./db');
    const r  = await db.listColumns(req.params.tabla);
    res.json({ tabla: req.params.tabla, columnas: r.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) =>
  res.json({
    status: 'ok',
    db:     `${process.env.DB_SERVER}/${process.env.DB_DATABASE}`,
    ts:     new Date(),
  })
);

// ── Error handler global — nunca deja al frontend sin respuesta JSON ──────────
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  if (process.env.NODE_ENV !== 'production') console.error(err.stack);

  // Errores comunes de SQL Azure con mensajes claros
  let mensaje = err.message || 'Error interno del servidor';
  if (err.message?.includes('Invalid object name'))
    mensaje = `Tabla no encontrada en la BD: ${err.message}. Verifica /api/debug/tablas`;
  if (err.message?.includes('Invalid column name'))
    mensaje = `Columna no encontrada: ${err.message}. Verifica /api/debug/columnas/<tabla>`;
  if (err.message?.includes('Login failed'))
    mensaje = 'Error de autenticación SQL Azure. Verifica usuario/contraseña en .env';
  if (err.message?.includes('ECONNREFUSED') || err.message?.includes('ESOCKET'))
    mensaje = 'No se puede conectar a SQL Azure. Verifica el servidor y el firewall en Azure Portal';

  res.status(err.status || 500).json({ error: mensaje });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`🚀  http://localhost:${PORT}`)
);

module.exports = app;
