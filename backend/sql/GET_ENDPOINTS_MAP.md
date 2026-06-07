# Mapa de GET a vistas/funciones SQL

Ejecutar primero `views_get_endpoints.sql` en SQL Server.

| Endpoint | Vista / SP usado |
| --- | --- |
| `GET /api/clientes` | `dbo.vw_api_clientes` |
| `GET /api/clientes/:id` | `dbo.vw_api_clientes` |
| `GET /api/clientes/buscar/inteligente` | `dbo.vw_api_clientes_busqueda` |
| `GET /api/productos/tipos` | `dbo.vw_api_tipos_producto` |
| `GET /api/productos` | `dbo.vw_api_productos` |
| `GET /api/productos/cliente/:idCliente` | `dbo.vw_api_productos` |
| `GET /api/productos/:id` | `dbo.vw_api_productos` |
| `GET /api/cuentas` | `dbo.vw_api_cuentas` |
| `GET /api/cuentas/:id` | `dbo.vw_api_cuentas` |
| `GET /api/prestamos` | `dbo.vw_api_creditos` |
| `GET /api/prestamos/:id` | `dbo.vw_api_creditos` |
| `GET /api/tarjetas` | `dbo.vw_api_tarjetas` |
| `GET /api/tarjetas/:id` | `dbo.vw_api_tarjetas` |
| `GET /api/transacciones` | `dbo.vw_api_transacciones` |
| `GET /api/transacciones/producto/:idProducto` | `dbo.vw_api_transacciones` |
| `GET /api/transacciones/:id` | `dbo.vw_api_transacciones` |
| `GET /api/riesgo` | `dbo.vw_api_riesgo_historial` |
| `GET /api/riesgo/:idCliente` | `dbo.fn_api_riesgo_cliente(@C_cliente, @D_periodo)` |
