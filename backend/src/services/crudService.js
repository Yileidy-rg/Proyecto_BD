import { getPool, sql } from '../config/db.js';

const tableConfig = {
  clientes: {
    id: 'ClienteID',
    listFn: 'fn_ListarClientes',
    getFn: 'fn_ObtenerClientePorId',
    createSp: 'sp_InsertarCliente',
    updateSp: 'sp_ActualizarCliente',
    deleteSp: 'sp_EliminarCliente',
    fields: ['TipoClienteID', 'TipoIdentificacionID', 'Identificacion', 'Nombre', 'Apellido1', 'Apellido2', 'FechaNacimiento', 'ProvinciaID', 'CantonID', 'DistritoID', 'ProfesionID']
  },
  productos: {
    id: 'ProductoID',
    listFn: 'fn_ListarProductos',
    getFn: 'fn_ObtenerProductoPorId',
    createSp: 'sp_InsertarProducto',
    updateSp: 'sp_ActualizarProducto',
    deleteSp: 'sp_EliminarProducto',
    fields: ['ClienteID', 'TipoProductoID', 'TipoMonedaID', 'FechaApertura', 'Estado']
  },
  cuentas: {
    id: 'CuentaID',
    listFn: 'fn_ListarCuentas',
    getFn: 'fn_ObtenerCuentaPorId',
    createSp: 'sp_InsertarCuenta',
    updateSp: 'sp_ActualizarCuenta',
    deleteSp: 'sp_EliminarCuenta',
    fields: ['ProductoID', 'TipoCuentaID', 'EstadoCuentaID', 'NumeroCuenta', 'Saldo']
  },
  prestamos: {
    id: 'PrestamoID',
    listFn: 'fn_ListarPrestamos',
    getFn: 'fn_ObtenerPrestamoPorId',
    createSp: 'sp_InsertarPrestamo',
    updateSp: 'sp_ActualizarPrestamo',
    deleteSp: 'sp_EliminarPrestamo',
    fields: ['ProductoID', 'TipoPrestamoID', 'Monto', 'Saldo', 'TasaInteres', 'PlazoMeses']
  },
  tarjetas: {
    id: 'TarjetaID',
    listFn: 'fn_ListarTarjetas',
    getFn: 'fn_ObtenerTarjetaPorId',
    createSp: 'sp_InsertarTarjeta',
    updateSp: 'sp_ActualizarTarjeta',
    deleteSp: 'sp_EliminarTarjeta',
    fields: ['ProductoID', 'TipoTarjetaID', 'EstadoTarjetaID', 'NumeroTarjeta', 'LimiteCredito', 'Saldo']
  },
  transacciones: {
    id: 'TransaccionID',
    listFn: 'fn_ListarTransacciones',
    getFn: 'fn_ObtenerTransaccionPorId',
    createSp: 'sp_InsertarTransaccion',
    updateSp: 'sp_ActualizarTransaccion',
    deleteSp: 'sp_EliminarTransaccion',
    fields: ['ProductoID', 'Fecha', 'Tipo', 'Categoria', 'Descripcion', 'Monto']
  }
};

function bindInputs(request, data, fields) {
  for (const field of fields) {
    request.input(field, data[field] ?? null);
  }
}

export function getCrudConfig(entity) {
  const config = tableConfig[entity];
  if (!config) throw new Error(`Entidad no permitida: ${entity}`);
  return config;
}

export async function list(entity) {
  const config = getCrudConfig(entity);
  const pool = await getPool();
  const result = await pool.request().query(`SELECT * FROM dbo.${config.listFn}()`);
  return result.recordset;
}

export async function getById(entity, id) {
  const config = getCrudConfig(entity);
  const pool = await getPool();
  const result = await pool.request()
    .input(config.id, sql.Int, Number(id))
    .query(`SELECT * FROM dbo.${config.getFn}(@${config.id})`);
  return result.recordset[0] || null;
}

export async function create(entity, data) {
  const config = getCrudConfig(entity);
  const pool = await getPool();
  const request = pool.request();
  bindInputs(request, data, config.fields);
  const result = await request.execute(config.createSp);
  return result.recordset?.[0] || { ok: true };
}

export async function update(entity, id, data) {
  const config = getCrudConfig(entity);
  const pool = await getPool();
  const request = pool.request().input(config.id, sql.Int, Number(id));
  bindInputs(request, data, config.fields);
  await request.execute(config.updateSp);
  return { ok: true };
}

export async function remove(entity, id) {
  const config = getCrudConfig(entity);
  const pool = await getPool();
  await pool.request().input(config.id, sql.Int, Number(id)).execute(config.deleteSp);
  return { ok: true };
}
