const express = require('express');
const router = express.Router();
const db = require('../db');
const sql = db.sql;

const NOMBRES = ['Luis','Ana','Carlos','Sofía','Diego','Valeria','Marco','Camila','Andrés','Natalia'];
const APELLIDOS = ['Mora','Rodríguez','Jiménez','Herrera','Castro','Vargas','Solís','Brenes','Arias','Quesada'];
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randNum = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pad = (n) => String(n).padStart(2, '0');

router.get('/', (req, res) => {
  res.json({
    escenarios: [
      { id: 1, nombre: 'Inserción mensual acumulativa', endpoint: 'POST /api/escenarios/1'},
      { id: 2, nombre: '27 transacciones de abril', endpoint: 'POST /api/escenarios/2' },
      { id: 3, nombre: 'Generar XML SICVECA + validaciones', endpoint: 'GET /api/xml/generar'  }
    ]
  });
});

router.post('/1', async (req, res, next) => {
  try {
    const ahora = new Date();
    const mesActual = ahora.getMonth() + 1;
    const anio = ahora.getFullYear();
    const log = [];

    for (let mes = 1; mes <= mesActual; mes++) {
      for (let i = 0; i < 5; i++) {
        const nombre = rand(NOMBRES);
        const apellido1 = rand(APELLIDOS);
        const apellido2 = rand(APELLIDOS);
        const cedula = `${anio}${pad(mes)}${pad(i)}${randNum(1000,9999)}`;
        const tipoProducto = [1,3,4][(mes + i) % 3];
        const fecha = `${anio}-${pad(mes)}-01`;

        const result = await db.query(`
          DECLARE @cliente INT = ISNULL((SELECT MAX(C_cliente) FROM dbo.Cliente), 0) + 1;
          DECLARE @cuenta INT = ISNULL((SELECT MAX(C_cuenta) FROM dbo.Cuenta), 0) + 1;
          DECLARE @tx BIGINT = ISNULL((SELECT MAX(N_id_transaccion) FROM dbo.Transaccion), 0) + 1;

          INSERT INTO dbo.Cliente (C_cliente, C_tipo_identificacion, D_numero_identificacion, C_tipo_persona,
            D_nombre_1, D_apellido_1, D_apellido_2, D_telefono, D_correo_electronico, M_ingreso_mensual, F_vinculacion)
          VALUES (@cliente, 1, @cedula, 1, @nombre, @apellido1, @apellido2, @telefono, @email, @ingreso, @fecha);

          INSERT INTO dbo.Cuenta (C_cuenta, C_cliente, C_tipo_producto, D_numero_cuenta, M_saldo_disponible, M_saldo_contable, F_apertura)
          VALUES (@cuenta, @cliente, @tipoProducto, CONCAT('CR', FORMAT(@cuenta, '0000000000')), @saldo, @saldo, @fecha);

          DECLARE @n INT = 0;
          WHILE @n < 5
          BEGIN
            INSERT INTO dbo.Transaccion (N_id_transaccion, C_cliente, C_tipo_transaccion, C_tipo_producto, N_cuenta, M_monto, D_descripcion, F_transaccion)
            VALUES (@tx + @n, @cliente, ((@n % 5) + 1), @tipoProducto, @cuenta, @monto + (@n * 1000), CONCAT('Escenario 1 tx ', @n + 1), DATEADD(DAY, @n, @fecha));
            SET @n = @n + 1;
          END

          SELECT @cliente AS id_cliente, @cuenta AS id_cuenta, @tx AS primera_transaccion;
        `, [
          { name: 'cedula', type: sql.NVarChar(50), value: cedula },
          { name: 'nombre', type: sql.NVarChar(60), value: nombre },
          { name: 'apellido1', type: sql.NVarChar(60), value: apellido1 },
          { name: 'apellido2', type: sql.NVarChar(60), value: apellido2 },
          { name: 'telefono', type: sql.NVarChar(20), value: `8${randNum(1000000,9999999)}` },
          { name: 'email', type: sql.NVarChar(120), value: `${nombre.toLowerCase()}${mes}${i}@test.com` },
          { name: 'ingreso', type: sql.Decimal(15, 2), value: randNum(250000, 900000) },
          { name: 'fecha', type: sql.Date, value: fecha },
          { name: 'tipoProducto', type: sql.TinyInt, value: tipoProducto },
          { name: 'saldo', type: sql.Decimal(18, 2), value: randNum(50000, 900000) },
          { name: 'monto', type: sql.Decimal(18, 2), value: randNum(1000, 500000) }
        ]);

        log.push({ mes, cliente: `${nombre} ${apellido1}`, cedula, tipo_producto: tipoProducto, transacciones: 5, ...result.recordset[0] });
      }
    }

    res.json({
      message: `Escenario 1 ejecutado: ${mesActual} meses × 5 clientes = ${mesActual * 5} clientes, ${mesActual * 5 * 5} transacciones`,
      data: log
    });
  } catch (err) { next(err); }
});

router.post('/2', async (req, res, next) => {
  try {
    const anio = new Date().getFullYear();
    const clientesRes = await db.query(`SELECT TOP 5 C_cliente FROM dbo.Cliente ORDER BY NEWID();`);
    const log = [];

    for (const cliente of clientesRes.recordset) {
      let cuentaRes = await db.query(`SELECT TOP 1 C_cuenta, C_tipo_producto FROM dbo.Cuenta WHERE C_cliente = @id ORDER BY C_cuenta;`, [
        { name: 'id', type: sql.Int, value: cliente.C_cliente }
      ]);

      if (!cuentaRes.recordset.length) {
        cuentaRes = await db.query(`
          DECLARE @cuenta INT = ISNULL((SELECT MAX(C_cuenta) FROM dbo.Cuenta), 0) + 1;
          INSERT INTO dbo.Cuenta (C_cuenta, C_cliente, C_tipo_producto, D_numero_cuenta, M_saldo_disponible, M_saldo_contable)
          VALUES (@cuenta, @cliente, 1, CONCAT('CR', FORMAT(@cuenta, '0000000000')), 0, 0);
          SELECT @cuenta AS C_cuenta, 1 AS C_tipo_producto;
        `, [{ name: 'cliente', type: sql.Int, value: cliente.C_cliente }]);
      }

      const cuenta = cuentaRes.recordset[0];
      const txBase = await db.query(`SELECT ISNULL(MAX(N_id_transaccion), 0) + 1 AS nextId FROM dbo.Transaccion;`);
      const nextId = Number(txBase.recordset[0].nextId);

      for (let i = 0; i < 27; i++) {
        await db.query(`
          INSERT INTO dbo.Transaccion (N_id_transaccion, C_cliente, C_tipo_transaccion, C_tipo_producto, N_cuenta, M_monto, D_descripcion, F_transaccion)
          VALUES (@tx, @cliente, @tipoTx, @tipoProducto, @cuenta, @monto, @descripcion, @fecha);
        `, [
          { name: 'tx', type: sql.BigInt, value: nextId + i },
          { name: 'cliente', type: sql.Int, value: cliente.C_cliente },
          { name: 'tipoTx', type: sql.SmallInt, value: (i % 29) + 1 },
          { name: 'tipoProducto', type: sql.TinyInt, value: cuenta.C_tipo_producto },
          { name: 'cuenta', type: sql.Int, value: cuenta.C_cuenta },
          { name: 'monto', type: sql.Decimal(18, 2), value: randNum(500, 250000) },
          { name: 'descripcion', type: sql.NVarChar(200), value: `Escenario 2 abril tx ${i + 1}` },
          { name: 'fecha', type: sql.DateTime, value: `${anio}-04-${pad(randNum(1, 30))}` }
        ]);
      }

      log.push({ id_cliente: cliente.C_cliente, id_cuenta: cuenta.C_cuenta, transacciones_insertadas: 27 });
    }

    res.json({
      message: `Escenario 2 ejecutado: 27 transacciones × ${clientesRes.recordset.length} clientes = ${clientesRes.recordset.length * 27} registros en abril`,
      data: log
    });
  } catch (err) { next(err); }
});

module.exports = router;
