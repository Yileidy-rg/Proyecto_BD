const request = require('supertest');

jest.mock('../db', () => {
  const type = (name) => ({ type: name });

  return {
    query: jest.fn(),
    sql: {
      MAX: 'MAX',
      BigInt: type('BigInt'),
      Bit: type('Bit'),
      Char: jest.fn((length) => ({ type: 'Char', length })),
      Date: type('Date'),
      DateTime: type('DateTime'),
      Decimal: jest.fn((precision, scale) => ({ type: 'Decimal', precision, scale })),
      Int: type('Int'),
      Money: type('Money'),
      NVarChar: jest.fn((length) => ({ type: 'NVarChar', length })),
      TinyInt: type('TinyInt'),
      VarChar: jest.fn((length) => ({ type: 'VarChar', length })),
    },
  };
});

const db = require('../db');
const app = require('../app');

const cliente = {
  id_cliente: 1,
  C_cliente: 1,
  cedula: '101110111',
  D_numero_identificacion: '101110111',
  nombre: 'Maria',
  D_nombre_1: 'Maria',
  D_nombre_2: 'Elena',
  primer_apellido: 'Mora',
  D_apellido_1: 'Mora',
  D_apellido_2: 'Soto',
  D_nombre_completo: 'Maria Elena Mora Soto',
  T_tipo_persona: 'Fisica',
  C_tipo_persona: 1,
  D_correo_electronico: 'maria@example.com',
  D_telefono: '88880000',
  D_estado_cliente: 'Activo',
};

const producto = {
  id_producto: 10,
  id_cliente: 1,
  tipo_producto: 1,
  producto: 'Cuenta de ahorro',
  referencia: 'CTA001',
  saldo: 125000,
  estado: 'Activo',
};

const transaccion = {
  id_transaccion: 100,
  id_cliente: 1,
  tipo_transaccion: 'Deposito',
  tipo_producto: 'Cuenta de ahorro',
  monto: 50000,
  fecha: '2026-06-01T10:00:00.000Z',
};

const xmlValido = `<?xml version="1.0" encoding="UTF-8"?>
<SICVECA version="2.0" fecha="2026-06-01T00:00:00.000Z">
  <ENCABEZADO>
    <ENTIDAD>Grupo2_IF5100</ENTIDAD>
    <TOTAL_CLIENTES>1</TOTAL_CLIENTES>
    <TOTAL_PRODUCTOS>1</TOTAL_PRODUCTOS>
    <TOTAL_TRANSACCIONES>1</TOTAL_TRANSACCIONES>
    <MONTO_TOTAL>50000.00</MONTO_TOTAL>
  </ENCABEZADO>
  <CLIENTES>
    <CLIENTE id="1">
      <IDENTIFICACION>101110111</IDENTIFICACION>
      <NOMBRE_COMPLETO>Maria Elena Mora Soto</NOMBRE_COMPLETO>
      <PERFIL_RIESGO>
        <INGRESO_MENSUAL>800000.00</INGRESO_MENSUAL>
        <PUNTAJE_TOTAL>72.00</PUNTAJE_TOTAL>
        <NIVEL>Medio</NIVEL>
        <PERIODO>2026-06</PERIODO>
      </PERFIL_RIESGO>
      <PRODUCTOS>
        <PRODUCTO>
          <TIPO>Cuenta de ahorro</TIPO>
          <REFERENCIA>CTA001</REFERENCIA>
          <SALDO>125000.00</SALDO>
          <FECHA_INICIO>2026-01-01T00:00:00.000Z</FECHA_INICIO>
        </PRODUCTO>
      </PRODUCTOS>
      <TRANSACCIONES>
        <TRANSACCION id="100">
          <TIPO>Deposito</TIPO>
          <PRODUCTO>Cuenta de ahorro</PRODUCTO>
          <MONTO>50000.00</MONTO>
          <FECHA>2026-06-01T10:00:00.000Z</FECHA>
        </TRANSACCION>
      </TRANSACCIONES>
    </CLIENTE>
  </CLIENTES>
</SICVECA>`;

function ok(recordset = [], recordsets) {
  return Promise.resolve({ recordset, recordsets: recordsets || [recordset] });
}

function sqlText(value) {
  return String(value).replace(/\s+/g, ' ');
}

beforeEach(() => {
  db.query.mockImplementation((query) => {
    const text = sqlText(query);

    if (text.includes('SELECT 1 AS ok')) {
      return ok([{ ok: 1 }]);
    }

    if (text.includes('sp_GenerarXML_LegitimacionRiesgos')) {
      return ok([], [
        [{
          Q_errores_encontrados: 0,
          D_estado: 'VALIDO',
          D_periodo: '2026-T2',
          D_entidad: 'Grupo2_IF51002026',
          Q_total_clientes: 1,
          Q_registros_cuadro_A: 1,
        }],
        [{ D_xml_sicveca: xmlValido }],
      ]);
    }

    if (text.includes('vw_api_clientes_busqueda')) {
      return ok([cliente]);
    }

    if (text.includes('vw_api_clientes')) {
      return ok([cliente]);
    }

    if (text.includes('vw_api_tipos_producto')) {
      return ok([{ value: 1, label: 'Cuenta de ahorro' }]);
    }

    if (text.includes('vw_api_productos')) {
      return ok([producto]);
    }

    if (text.includes('vw_api_transacciones')) {
      return ok([transaccion]);
    }

    if (text.includes('vw_api_riesgo_historial')) {
      return ok([{
        id_evaluacion: 20,
        id_cliente: 1,
        puntaje_total: 72,
        nivel_riesgo: 'Medio',
        fecha_evaluacion: '2026-06-01T00:00:00.000Z',
      }]);
    }

    if (text.includes('fn_api_riesgo_cliente')) {
      return ok([{
        D_numero_identificacion: cliente.cedula,
        D_nombre: cliente.D_nombre_completo,
        M_puntaje_total: 72,
        D_nivel_riesgo: 'Medio',
      }]);
    }

    if (text.includes('sp_InsertarRegistroFinanciero')) {
      return ok([{ id: 999 }]);
    }

    return ok([]);
  });
});

describe('API health', () => {
  test('GET /api/health retorna ok sin levantar listen()', async () => {
    const res = await request(app).get('/api/health');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('db');
    expect(typeof res.body.db).toBe('string');
  });
});

describe('Clientes', () => {
  test('GET /api/clientes lista clientes', async () => {
    const res = await request(app).get('/api/clientes');

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual([expect.objectContaining({ id_cliente: 1 })]);
    expect(res.body.total).toBe(1);
  });

  test('GET /api/clientes/:id obtiene un cliente existente', async () => {
    const res = await request(app).get('/api/clientes/1');

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({ id_cliente: 1, cedula: '101110111' });
  });

  test('GET /api/clientes/buscar/inteligente usa la ruta real', async () => {
    const res = await request(app)
      .get('/api/clientes/buscar/inteligente')
      .query({ termino: 'm', limite: 20 });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual([expect.objectContaining({ C_cliente: 1 })]);
    expect(res.body.total).toBe(1);
  });

  test('POST /api/clientes falla sin campos requeridos sin modificar datos', async () => {
    const res = await request(app).post('/api/clientes').send({ nombre: 'Solo Nombre' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(db.query).not.toHaveBeenCalledWith(expect.stringContaining('sp_InsertarRegistroFinanciero'), expect.anything());
  });
});

describe('Productos', () => {
  test('GET /api/productos lista productos consolidados', async () => {
    const res = await request(app).get('/api/productos');

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual([expect.objectContaining({ id_producto: 10 })]);
    expect(res.body.total).toBe(1);
  });

  test('GET /api/productos/tipos lista catalogo de tipos', async () => {
    const res = await request(app).get('/api/productos/tipos');

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual([expect.objectContaining({ value: 1 })]);
  });

  test('GET /api/productos/:id obtiene producto existente', async () => {
    const res = await request(app).get('/api/productos/10');

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({ id_producto: 10, id_cliente: 1 });
  });

  test('POST /api/productos falla sin id_cliente ni tipo_producto sin modificar datos', async () => {
    const res = await request(app).post('/api/productos').send({ monto: 1000 });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

describe('Transacciones', () => {
  test('GET /api/transacciones lista movimientos', async () => {
    const res = await request(app).get('/api/transacciones');

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual([expect.objectContaining({ id_transaccion: 100 })]);
  });

  test('GET /api/transacciones/:id obtiene movimiento existente', async () => {
    const res = await request(app).get('/api/transacciones/100');

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({ id_transaccion: 100, monto: 50000 });
  });

  test('POST /api/transacciones falla sin monto sin modificar datos', async () => {
    const res = await request(app).post('/api/transacciones').send({
      id_producto: 1,
      tipo_transaccion: 'DEPOSITO',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

describe('Riesgo', () => {
  test('GET /api/riesgo lista historial', async () => {
    const res = await request(app).get('/api/riesgo');

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual([expect.objectContaining({ id_evaluacion: 20 })]);
  });

  test('GET /api/riesgo/:idCliente responde con evaluacion del cliente', async () => {
    const res = await request(app).get('/api/riesgo/1');

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      id_cliente: 1,
      cedula: '101110111',
      puntaje_total: 72,
      nivel_riesgo: 'Medio',
    });
  });
});

describe('Escenarios', () => {
  test('GET /api/escenarios lista escenarios disponibles', async () => {
    const res = await request(app).get('/api/escenarios');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.escenarios)).toBe(true);
    expect(res.body.escenarios.map(e => e.id)).toEqual(expect.arrayContaining([1, 2, 3]));
  });
});

describe('XML SICVECA', () => {
  test('GET /api/xml/generar genera estructura XML desde el endpoint real', async () => {
    const res = await request(app).get('/api/xml/generar');

    expect(res.statusCode).toBe(200);
    expect(res.body.xml).toContain('<?xml');
    expect(res.body.validaciones).toMatchObject({ valido: true, total_errores: 0 });
    expect(res.body.resumen).toMatchObject({ origen: 'sp_GenerarXML_LegitimacionRiesgos' });
  });

  test('POST /api/xml/validar acepta XML valido', async () => {
    const res = await request(app).post('/api/xml/validar').send({ xml: xmlValido });

    expect(res.statusCode).toBe(200);
    expect(res.body.validaciones).toMatchObject({ valido: true, total_errores: 0 });
  });

  test('POST /api/xml/validar retorna errores claros para XML incompleto', async () => {
    const res = await request(app).post('/api/xml/validar').send({
      xml: '<SICVECA fecha="no-es-fecha"><CLIENTES><CLIENTE id="x"></CLIENTE></CLIENTES></SICVECA>',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.validaciones.valido).toBe(false);
    expect(res.body.validaciones.errores).toEqual(expect.arrayContaining([
      expect.stringContaining('IDENTIFICACION'),
      expect.stringContaining('PRODUCTOS'),
      expect.stringContaining('TRANSACCIONES'),
      expect.stringContaining('PERFIL_RIESGO'),
    ]));
  });
});
