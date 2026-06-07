# SICVECA - Proyecto Node.js + Express + SQL Server

Sistema web para gestion de clientes, productos financieros, transacciones, riesgo, escenarios SICVECA y generacion/validacion XML.

## Stack

- Backend: Node.js, Express, SQL Server, mssql, express-validator
- Frontend: React 18, axios, recharts
- Pruebas: Jest + Supertest
- Gestor recomendado: pnpm

## Estructura

```text
.
├── backend/
│   ├── app.js                 # Configuracion Express exportable para Supertest
│   ├── server.js              # Solo levanta app.listen()
│   ├── db/index.js            # Conexion SQL Server y helpers DB
│   ├── routes/
│   │   ├── clientes.js
│   │   ├── productos.js
│   │   ├── cuentas.js
│   │   ├── prestamos.js
│   │   ├── tarjetas.js
│   │   ├── transacciones.js
│   │   ├── riesgo.js
│   │   ├── escenarios.js
│   │   ├── xml.js
│   │   ├── schema.js
│   │   └── *_financieros.js
│   ├── sql/
│   │   ├── sp_crud_escrituras.sql
│   │   ├── views_get_endpoints.sql
│   │   └── GET_ENDPOINTS_MAP.md
│   └── tests/api.test.js
├── frontend/
│   └── src/
├── package.json
└── pnpm-lock.yaml
```

## Instalacion

Requisitos:

- Node.js 18 o superior
- pnpm 8 o superior
- SQL Server accesible
- Base de datos restaurada, por ejemplo `Grupo2_IF51002026`

Instalar dependencias:

```bash
pnpm install
```

Crear variables de entorno:

```bash
cp backend/.env.example backend/.env
```

Configurar `backend/.env`:

```env
DB_SERVER=localhost
DB_DATABASE=Grupo2_IF51002026
DB_USER=api_user
DB_PASSWORD=tu_password
DB_PORT=1433
```

## Ejecucion

Backend:

```bash
pnpm --filter backend dev
```

URL local:

```text
http://localhost:4000
```

Frontend:

```bash
pnpm --filter frontend start
```

URL local:

```text
http://localhost:3000
```

Backend y frontend juntos:

```bash
pnpm dev
```

## Endpoints Principales

Salud y esquema:

```text
GET /api/health
GET /api/schema/tables
GET /api/schema/columns/:table
```

Clientes:

```text
GET    /api/clientes
GET    /api/clientes/:id
GET    /api/clientes/buscar/inteligente?termino=&limite=
POST   /api/clientes
PUT    /api/clientes/:id
DELETE /api/clientes/:id
```

Productos y productos especificos:

```text
GET    /api/productos
GET    /api/productos/tipos
GET    /api/productos/:id
POST   /api/productos
PUT    /api/productos/:id
DELETE /api/productos/:id

GET/POST/PUT/DELETE /api/cuentas
GET/POST/PUT/DELETE /api/prestamos
GET/POST/PUT/DELETE /api/tarjetas
GET/POST/PUT/DELETE /api/depositos-plazo
GET/POST/PUT/DELETE /api/depositos-judiciales
GET/POST/PUT/DELETE /api/leasing
GET/POST/PUT/DELETE /api/avales
GET/POST/PUT/DELETE /api/transferencias
GET/POST/PUT/DELETE /api/divisas
GET/POST/PUT/DELETE /api/fideicomisos
GET/POST/PUT/DELETE /api/atm
GET/POST/PUT/DELETE /api/banca-en-linea
GET/POST/PUT/DELETE /api/cajas-seguridad
```

Transacciones:

```text
GET    /api/transacciones
GET    /api/transacciones/:id
GET    /api/transacciones/producto/:idProducto
POST   /api/transacciones
PUT    /api/transacciones/:id
DELETE /api/transacciones/:id
```

Riesgo:

```text
GET  /api/riesgo
GET  /api/riesgo/:idCliente?periodo=YYYY-MM
POST /api/riesgo/recalcular-todos
```

Escenarios:

```text
GET  /api/escenarios
POST /api/escenarios/1
POST /api/escenarios/2
POST /api/escenarios/3
```

XML SICVECA:

```text
GET  /api/xml/generar
POST /api/xml/validar
```

## Validaciones

Las rutas principales usan `express-validator`. Cuando el payload, parametros o query string son invalidos, la API responde `400`:

```json
{
  "error": "Payload invalido",
  "errors": [
    {
      "field": "monto",
      "location": "body",
      "message": "monto debe ser un monto mayor a cero"
    }
  ]
}
```

## Pruebas

Ejecutar pruebas del backend:

```bash
pnpm --filter backend test
```

Las pruebas usan Supertest contra `backend/app.js` y mockean la base de datos para no modificar datos reales.

## Scripts SQL Necesarios

Ejecutar estos scripts en SQL Server despues de restaurar la base:

1. `backend/sql/sp_crud_escrituras.sql`
   - Crea procedimientos almacenados para escrituras CRUD transaccionales.
   - Usado por INSERT, UPDATE y DELETE.

2. `backend/sql/views_get_endpoints.sql`
   - Crea vistas y funciones usadas por endpoints GET.
   - Incluye vistas para clientes, productos, cuentas, creditos, tarjetas, transacciones y riesgo.

3. `backend/sql/GET_ENDPOINTS_MAP.md`
   - Documento de referencia que indica que vista o funcion usa cada endpoint GET.

Orden recomendado:

```text
1. Restaurar base SQL Server
2. Ejecutar backend/sql/sp_crud_escrituras.sql
3. Ejecutar backend/sql/views_get_endpoints.sql
4. Configurar backend/.env
5. Levantar backend
```

## Notas de Desarrollo

- `backend/app.js` contiene la app Express y se importa en pruebas.
- `backend/server.js` solo llama `app.listen`.
- `GET /api/schema/*` se mantiene como ayuda de inspeccion del esquema real.
- `GET /api/xml/generar` conserva el fallback cuando el SP XML no esta disponible.
