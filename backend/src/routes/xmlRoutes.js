import { Router } from 'express';
import { create } from 'xmlbuilder2';
import { getPool } from '../config/db.js';

const router = Router();

router.get('/generar', async (req, res, next) => {
  try {
    const pool = await getPool();
    const clientes = await pool.request().query('SELECT * FROM dbo.fn_ListarClientes()');
    const productos = await pool.request().query('SELECT * FROM dbo.fn_ListarProductos()');
    const transacciones = await pool.request().query('SELECT * FROM dbo.fn_ListarTransacciones()');

    const doc = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('SICVECA')
        .ele('Clientes');

    for (const cliente of clientes.recordset) {
      const nodoCliente = doc.ele('Cliente')
        .ele('ClienteID').txt(String(cliente.ClienteID)).up()
        .ele('Identificacion').txt(cliente.Identificacion || '').up()
        .ele('Nombre').txt(cliente.Nombre || '').up();

      const productosCliente = productos.recordset.filter(p => p.ClienteID === cliente.ClienteID);
      const nodoProductos = nodoCliente.ele('Productos');
      for (const producto of productosCliente) {
        const nodoProducto = nodoProductos.ele('Producto')
          .ele('ProductoID').txt(String(producto.ProductoID)).up()
          .ele('TipoProductoID').txt(String(producto.TipoProductoID)).up();
        const transProducto = transacciones.recordset.filter(t => t.ProductoID === producto.ProductoID);
        const nodoTrans = nodoProducto.ele('Transacciones');
        for (const t of transProducto) {
          nodoTrans.ele('Transaccion')
            .ele('TransaccionID').txt(String(t.TransaccionID)).up()
            .ele('Fecha').txt(String(t.Fecha)).up()
            .ele('Monto').txt(String(t.Monto)).up()
            .up();
        }
        nodoProducto.up();
      }
      nodoProductos.up();
      nodoCliente.up();
    }

    const xml = doc.end({ prettyPrint: true });
    res.setHeader('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) { next(err); }
});

export default router;
