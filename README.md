# DEV SICVECA - React + Node.js + SQL Server

## Qué incluye
- Backend en Node.js/Express.
- Frontend en React/Vite.
- Conexión a SQL Server con `mssql`.
- Rutas base para CRUD genérico.
- Endpoint de búsqueda inteligente.
- Endpoint de cálculo de riesgo.
- Endpoint inicial para generar XML.
- Scripts SQL base: funciones, procedimientos, búsqueda y riesgo.

## Orden recomendado
1. Restaurar `Grupo5_IF51002026.bak` en SQL Server.
2. Revisar columnas exactas de las tablas.
3. Ajustar los scripts SQL en `/database` según columnas reales.
4. Ejecutar scripts SQL en SQL Server Management Studio.
5. Configurar `/backend/.env` usando `.env.example`.
6. Ejecutar backend:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
7. Ejecutar frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Endpoints principales
- `GET /api/crud/clientes`
- `GET /api/crud/productos`
- `GET /api/crud/cuentas`
- `GET /api/crud/prestamos`
- `GET /api/crud/tarjetas`
- `GET /api/crud/transacciones`
- `GET /api/busqueda/clientes?texto=ana`
- `POST /api/riesgo/clientes/1/calcular`
- `GET /api/xml/generar`

## Nota importante
Los nombres de tablas detectados del respaldo son compatibles con el avance actual, pero algunas columnas pueden variar. Antes de entregar, hay que restaurar la base y confirmar el diseño exacto con `sp_help NombreTabla`.
