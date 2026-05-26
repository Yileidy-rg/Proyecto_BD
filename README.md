# SICVECA — Sistema de Finanzas Personales
## Proyecto Grupo 5 · IF5100 · Sprint 2

### Stack
- **Backend**: Node.js + Express
- **Frontend**: React 18
- **BD**: Adaptable (SQL Server / PostgreSQL / MySQL / Mock)

---

## Estructura del Proyecto

```
finanzas-app/
├── backend/
│   ├── db/index.js          ← Adaptador DB (cambia DB_CLIENT en .env)
│   ├── routes/
│   │   ├── clientes.js      ← CRUD + Búsqueda inteligente (Req. 1 & 3)
│   │   ├── productos.js     ← CRUD productos
│   │   ├── cuentas.js       ← CRUD cuentas
│   │   ├── prestamos.js     ← CRUD préstamos
│   │   ├── tarjetas.js      ← CRUD tarjetas
│   │   ├── transacciones.js ← CRUD transacciones
│   │   ├── riesgo.js        ← Calificadora de riesgo (Req. 2)
│   │   ├── escenarios.js    ← Escenarios 1 & 2 (Req. 4)
│   │   └── xml.js           ← Generador XML SICVECA (Escenario 3)
│   ├── tests/api.test.js    ← Pruebas unitarias Jest
│   ├── server.js
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.js            ← Dashboard completo
    │   └── utils/api.js      ← Capa de acceso a la API
    └── package.json
```

---

## Instalación y ejecución

### 1. Backend

```bash
cd backend
cp .env.example .env
# Editar .env — por defecto usa DB_CLIENT=mock (sin BD real)
npm install
npm run dev
# → http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
npm install
npm start
# → http://localhost:3000
```

### 3. Tests

```bash
cd backend
npm test
```

---

## Conectar a la base de datos real (SQL Server — .bak subido)

1. Restaurar `Grupo5_IF51002026.bak` en SQL Server.
2. Editar `backend/.env`:
   ```
   DB_CLIENT=mssql
   DB_HOST=localhost
   DB_PORT=1433
   DB_NAME=Grupo5_IF5100
   DB_USER=sa
   DB_PASS=TuPassword
   ```
3. Cambiar las llamadas en cada `routes/*.js`:
   - Lecturas: `db.callFn('fn_ObtenerClientes', {})` en vez de `db.getAll()`
   - Escrituras: `db.callSP('sp_InsertarCliente', datos)` en vez de `db.insert()`

---

## Requerimientos cubiertos

| # | Requerimiento | Archivos |
|---|---------------|---------|
| 1 | CRUD de todas las tablas transaccionales | `routes/*.js` |
| 1 | Funciones para lectura, SPs para escritura | `db/index.js` (comentarios SQL real) |
| 2 | Calificadora de riesgo por cliente | `routes/riesgo.js` |
| 3 | Búsqueda inteligente clientes (<3s) | `routes/clientes.js` → `GET /buscar` |
| 4.1 | Escenario 1 — inserción mensual acumulativa | `routes/escenarios.js` → `POST /1` |
| 4.2 | Escenario 2 — 27 transacciones de abril | `routes/escenarios.js` → `POST /2` |
| 4.3 | Escenario 3 — XML SICVECA + validaciones | `routes/xml.js` |
| 4 | Pruebas unitarias Jest | `tests/api.test.js` |

---

## API Endpoints

```
GET    /api/health
GET    /api/clientes
GET    /api/clientes/buscar?q=&cedula=&nombre=&provincia=
GET    /api/clientes/:id
POST   /api/clientes
PUT    /api/clientes/:id
DELETE /api/clientes/:id

GET/POST/PUT/DELETE /api/productos
GET/POST/PUT/DELETE /api/cuentas
GET/POST/PUT/DELETE /api/prestamos
GET/POST/PUT/DELETE /api/tarjetas
GET/POST/PUT/DELETE /api/transacciones

GET    /api/riesgo           (historial)
GET    /api/riesgo/:idCliente (evaluar)

GET    /api/escenarios
POST   /api/escenarios/1
POST   /api/escenarios/2

GET    /api/xml/generar
```

---

## Tablas del .bak identificadas

### Transaccionales (CRUD completo)
- `CLIENTE`, `PRODUCTO`, `CUENTA`, `PRESTAMO`, `TARJETA`, `TRANSACCION`, `EVALUACION_RIESGO`, `Dependencia`

### Catálogos (solo lectura)
- `CAT_NivelRiesgo`, `CATALOGO_Canton`, `CATALOGO_Distrito`, `CATALOGO_EstadoCuenta`,
  `CATALOGO_EstadoPrestamo`, `CATALOGO_EstadoTarjeta`, `CATALOGO_Pais`, `CATALOGO_Profesion`,
  `CATALOGO_Provincia`, `CATALOGO_TipoCliente`, `CATALOGO_TipoCuenta`, `CATALOGO_TipoDependencia`,
  `CATALOGO_TipoIdentificacion`, `CATALOGO_TipoMoneda`, `CATALOGO_TipoPrestamo`,
  `CATALOGO_TipoProducto`, `CATALOGO_TipoTarjeta`
