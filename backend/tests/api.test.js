/**
 * tests/api.test.js — Pruebas unitarias (Req. 4)
 * 
 * Ejecutar: npm test
 * 
 * Los escenarios se pueden ejecutar N veces sin eliminar registros anteriores.
 */
const request = require('supertest');
const app = require('../server');

// ─────────────────────────────────────────────────────────────────────────────
// PRUEBAS: CLIENTES (CRUD)
// ─────────────────────────────────────────────────────────────────────────────
describe('CRUD Clientes', () => {
  let idClienteCreado;

  test('GET /api/clientes — lista todos los clientes', async () => {
    const res = await request(app).get('/api/clientes');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/clientes — crea un cliente nuevo', async () => {
    const nuevoCliente = {
      nombre: 'Test', primer_apellido: 'Usuario', segundo_apellido: 'Prueba',
      cedula: '999888777', tipo_cliente: 1, profesion: 1,
      fecha_nacimiento: '1990-01-01', email: 'test@test.com', telefono: '88001100',
    };
    const res = await request(app).post('/api/clientes').send(nuevoCliente);
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('message', 'Cliente creado exitosamente');
    idClienteCreado = res.body.data?.id_cliente;
  });

  test('GET /api/clientes/:id — obtiene cliente por ID', async () => {
    const res = await request(app).get('/api/clientes/1');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('cedula');
  });

  test('PUT /api/clientes/:id — actualiza un cliente', async () => {
    const res = await request(app).put('/api/clientes/1').send({ email: 'nuevo@email.com' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'Cliente actualizado exitosamente');
  });

  test('POST /api/clientes — falla si faltan campos requeridos', async () => {
    const res = await request(app).post('/api/clientes').send({ nombre: 'Solo Nombre' });
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PRUEBAS: BÚSQUEDA INTELIGENTE
// ─────────────────────────────────────────────────────────────────────────────
describe('Búsqueda Inteligente de Clientes', () => {
  test('GET /api/clientes/buscar?q= — busca con término general', async () => {
    const res = await request(app).get('/api/clientes/buscar?q=juan');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('suggestions');
  });

  test('GET /api/clientes/buscar?cedula= — busca por cédula parcial', async () => {
    const res = await request(app).get('/api/clientes/buscar?cedula=101');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('Búsqueda responde en menos de 3 segundos', async () => {
    const inicio = Date.now();
    await request(app).get('/api/clientes/buscar?q=a');
    const tiempo = Date.now() - inicio;
    expect(tiempo).toBeLessThan(3000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PRUEBAS: PRODUCTOS
// ─────────────────────────────────────────────────────────────────────────────
describe('CRUD Productos', () => {
  test('GET /api/productos — lista todos los productos', async () => {
    const res = await request(app).get('/api/productos');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/productos — crea un producto', async () => {
    const res = await request(app).post('/api/productos').send({
      id_cliente: 1, tipo_producto: 3, moneda: 1,
      descripcion: 'Cuenta de prueba', estado: 'ACTIVO',
    });
    expect(res.statusCode).toBe(201);
  });

  test('POST /api/productos — falla sin id_cliente', async () => {
    const res = await request(app).post('/api/productos').send({ tipo_producto: 1 });
    expect(res.statusCode).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PRUEBAS: TRANSACCIONES
// ─────────────────────────────────────────────────────────────────────────────
describe('CRUD Transacciones', () => {
  test('GET /api/transacciones — lista transacciones', async () => {
    const res = await request(app).get('/api/transacciones');
    expect(res.statusCode).toBe(200);
  });

  test('POST /api/transacciones — registra transacción válida', async () => {
    const res = await request(app).post('/api/transacciones').send({
      id_producto: 1, tipo_transaccion: 'DEPOSITO',
      monto: 50000, descripcion: 'Test deposito',
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe('Transacción registrada');
  });

  test('POST /api/transacciones — falla sin monto', async () => {
    const res = await request(app).post('/api/transacciones').send({
      id_producto: 1, tipo_transaccion: 'DEPOSITO',
    });
    expect(res.statusCode).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PRUEBAS: CALIFICADORA DE RIESGO
// ─────────────────────────────────────────────────────────────────────────────
describe('Evaluación de Riesgo', () => {
  test('GET /api/riesgo/:id — calcula riesgo para cliente 1', async () => {
    const res = await request(app).get('/api/riesgo/1');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('puntaje_total');
    expect(res.body.data).toHaveProperty('nivel_riesgo');
    expect(['BAJO', 'MEDIO', 'ALTO']).toContain(res.body.data.nivel_riesgo);
  });

  test('GET /api/riesgo/:id — retorna 404 para cliente inexistente', async () => {
    const res = await request(app).get('/api/riesgo/99999');
    expect(res.statusCode).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PRUEBAS: ESCENARIOS (pueden ejecutarse N veces)
// ─────────────────────────────────────────────────────────────────────────────
describe('Escenario 1 — Inserción mensual acumulativa', () => {
  test('Primera ejecución: inserta clientes del año', async () => {
    const res = await request(app).post('/api/escenarios/1').timeout(15000);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body.data.length).toBeGreaterThan(0);
  }, 15000);

  test('Segunda ejecución: NO elimina los anteriores (acumula)', async () => {
    const antes = await request(app).get('/api/clientes');
    const totalAntes = antes.body.total;

    await request(app).post('/api/escenarios/1').timeout(15000);

    const despues = await request(app).get('/api/clientes');
    const totalDespues = despues.body.total;

    expect(totalDespues).toBeGreaterThan(totalAntes);
  }, 15000);
});

describe('Escenario 2 — 27 transacciones en abril', () => {
  test('Inserta 27 transacciones para clientes random', async () => {
    const res = await request(app).post('/api/escenarios/2').timeout(10000);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('data');
  }, 10000);
});

// ─────────────────────────────────────────────────────────────────────────────
// PRUEBAS: GENERACIÓN XML
// ─────────────────────────────────────────────────────────────────────────────
describe('Generación XML SICVECA', () => {
  test('GET /api/xml/generar — genera XML válido', async () => {
    const res = await request(app).get('/api/xml/generar');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('xml');
    expect(res.body.xml).toContain('<?xml version="1.0"');
    expect(res.body.xml).toContain('<SICVECA');
    expect(res.body).toHaveProperty('validaciones');
  });

  test('XML contiene sección de clientes', async () => {
    const res = await request(app).get('/api/xml/generar');
    expect(res.body.xml).toContain('<CLIENTES>');
    expect(res.body.xml).toContain('</CLIENTES>');
  });
});

// Health check
describe('API Health', () => {
  test('GET /api/health — retorna ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
