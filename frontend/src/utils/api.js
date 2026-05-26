// src/utils/api.js — Capa de acceso al backend
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://backend-bases-de-datos.onrender.com/api',
  timeout: 10000,
});

// ── Clientes ─────────────────────────────────────────────────────────────────
export const clientesAPI = {
  getAll: () => api.get('/clientes').then(r => r.data),
  getById: (id) => api.get(`/clientes/${id}`).then(r => r.data),
  buscar: (params) => api.get('/clientes/buscar', { params }).then(r => r.data),
  create: (data) => api.post('/clientes', data).then(r => r.data),
  update: (id, data) => api.put(`/clientes/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/clientes/${id}`).then(r => r.data),
};

// ── Productos ─────────────────────────────────────────────────────────────────
export const productosAPI = {
  getAll: () => api.get('/productos').then(r => r.data),
  getByCliente: (idCliente) => api.get(`/productos/cliente/${idCliente}`).then(r => r.data),
  create: (data) => api.post('/productos', data).then(r => r.data),
  update: (id, data) => api.put(`/productos/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/productos/${id}`).then(r => r.data),
};

// ── Cuentas ───────────────────────────────────────────────────────────────────
export const cuentasAPI = {
  getAll: () => api.get('/cuentas').then(r => r.data),
  create: (data) => api.post('/cuentas', data).then(r => r.data),
  update: (id, data) => api.put(`/cuentas/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/cuentas/${id}`).then(r => r.data),
};

// ── Préstamos ─────────────────────────────────────────────────────────────────
export const prestamosAPI = {
  getAll: () => api.get('/prestamos').then(r => r.data),
  create: (data) => api.post('/prestamos', data).then(r => r.data),
  update: (id, data) => api.put(`/prestamos/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/prestamos/${id}`).then(r => r.data),
};

// ── Tarjetas ──────────────────────────────────────────────────────────────────
export const tarjetasAPI = {
  getAll: () => api.get('/tarjetas').then(r => r.data),
  create: (data) => api.post('/tarjetas', data).then(r => r.data),
  update: (id, data) => api.put(`/tarjetas/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/tarjetas/${id}`).then(r => r.data),
};

// ── Transacciones ─────────────────────────────────────────────────────────────
export const transaccionesAPI = {
  getAll: () => api.get('/transacciones').then(r => r.data),
  create: (data) => api.post('/transacciones', data).then(r => r.data),
  delete: (id) => api.delete(`/transacciones/${id}`).then(r => r.data),
};

// ── Riesgo ────────────────────────────────────────────────────────────────────
export const riesgoAPI = {
  evaluar: (idCliente) => api.get(`/riesgo/${idCliente}`).then(r => r.data),
  getAll: () => api.get('/riesgo').then(r => r.data),
};

// ── Escenarios ────────────────────────────────────────────────────────────────
export const escenariosAPI = {
  ejecutar1: () => api.post('/escenarios/1', {}, { timeout: 30000 }).then(r => r.data),
  ejecutar2: () => api.post('/escenarios/2', {}, { timeout: 20000 }).then(r => r.data),
};

// ── XML ───────────────────────────────────────────────────────────────────────
export const xmlAPI = {
  generar: () => api.get('/xml/generar').then(r => r.data),
};

export default api;
