/*
  Stored procedures para escrituras CRUD.
  Ejecutar este script en la base Grupo2_IF51002026 antes de usar las rutas refactorizadas.

  Estos SPs concentran INSERT, UPDATE y DELETE con:
  - whitelist de tablas permitidas
  - transacciones SQL
  - TRY/CATCH con ROLLBACK
  - payload JSON para mantener las rutas existentes sin cambiar URLs
*/

CREATE OR ALTER PROCEDURE dbo.sp_InsertarRegistroFinanciero
  @T_tabla SYSNAME,
  @C_id_columna SYSNAME,
  @D_payload NVARCHAR(MAX),
  @N_id_generado INT OUTPUT
AS
BEGIN
  SET NOCOUNT ON;

  BEGIN TRY
    BEGIN TRAN;

    DECLARE @Permitidas TABLE (T_tabla SYSNAME PRIMARY KEY, C_id_columna SYSNAME NOT NULL);
    INSERT INTO @Permitidas (T_tabla, C_id_columna)
    VALUES
      ('Cliente', 'C_cliente'),
      ('Cuenta', 'C_cuenta'),
      ('Credito', 'C_credito'),
      ('TarjetaCredito', 'C_tarjeta'),
      ('Transaccion', 'N_id_transaccion'),
      ('DepositoPlazo', 'C_deposito'),
      ('DepositoJudicial', 'C_dep_judicial'),
      ('Leasing', 'C_leasing'),
      ('AvalGarantia', 'C_aval'),
      ('Transferencia', 'C_transferencia'),
      ('OperacionDivisas', 'C_operacion'),
      ('Fideicomiso', 'C_fideicomiso'),
      ('UsoATM', 'C_uso_atm'),
      ('BancaEnLinea', 'C_operacion_bl'),
      ('CajaSeguridad', 'C_caja');

    IF NOT EXISTS (
      SELECT 1 FROM @Permitidas WHERE T_tabla = @T_tabla AND C_id_columna = @C_id_columna
    )
      THROW 51000, 'Tabla o columna id no permitida para escritura.', 1;

    IF ISJSON(@D_payload) <> 1
      THROW 51001, 'Payload JSON invalido.', 1;

    DECLARE @objectId INT = OBJECT_ID(QUOTENAME('dbo') + '.' + QUOTENAME(@T_tabla));
    IF @objectId IS NULL
      THROW 51002, 'Tabla no encontrada.', 1;

    DECLARE @cols NVARCHAR(MAX);
    DECLARE @vals NVARCHAR(MAX);

    SELECT
      @cols = STRING_AGG(QUOTENAME(j.[key]), ', '),
      @vals = STRING_AGG('JSON_VALUE(@payload, ''$."' + REPLACE(j.[key], '''', '''''') + '"'')', ', ')
    FROM OPENJSON(@D_payload) j
    INNER JOIN sys.columns c
      ON c.object_id = @objectId
     AND c.name = j.[key]
    WHERE j.[key] <> @C_id_columna;

    IF @cols IS NULL
      THROW 51003, 'No hay columnas validas para insertar.', 1;

    DECLARE @maxSql NVARCHAR(MAX) =
      N'SELECT @nextId = ISNULL(MAX(' + QUOTENAME(@C_id_columna) + N'), 0) + 1 FROM dbo.' +
      QUOTENAME(@T_tabla) + N' WITH (UPDLOCK, HOLDLOCK);';

    EXEC sp_executesql @maxSql, N'@nextId INT OUTPUT', @nextId = @N_id_generado OUTPUT;

    DECLARE @insertSql NVARCHAR(MAX) =
      N'INSERT INTO dbo.' + QUOTENAME(@T_tabla) +
      N' (' + QUOTENAME(@C_id_columna) + N', ' + @cols + N') VALUES (@newId, ' + @vals + N');';

    EXEC sp_executesql
      @insertSql,
      N'@newId INT, @payload NVARCHAR(MAX)',
      @newId = @N_id_generado,
      @payload = @D_payload;

    COMMIT;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    THROW;
  END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ActualizarRegistroFinanciero
  @T_tabla SYSNAME,
  @C_id_columna SYSNAME,
  @N_id INT,
  @D_payload NVARCHAR(MAX)
AS
BEGIN
  SET NOCOUNT ON;

  BEGIN TRY
    BEGIN TRAN;

    DECLARE @Permitidas TABLE (T_tabla SYSNAME PRIMARY KEY, C_id_columna SYSNAME NOT NULL);
    INSERT INTO @Permitidas (T_tabla, C_id_columna)
    VALUES
      ('Cliente', 'C_cliente'),
      ('Cuenta', 'C_cuenta'),
      ('Credito', 'C_credito'),
      ('TarjetaCredito', 'C_tarjeta'),
      ('Transaccion', 'N_id_transaccion'),
      ('DepositoPlazo', 'C_deposito'),
      ('DepositoJudicial', 'C_dep_judicial'),
      ('Leasing', 'C_leasing'),
      ('AvalGarantia', 'C_aval'),
      ('Transferencia', 'C_transferencia'),
      ('OperacionDivisas', 'C_operacion'),
      ('Fideicomiso', 'C_fideicomiso'),
      ('UsoATM', 'C_uso_atm'),
      ('BancaEnLinea', 'C_operacion_bl'),
      ('CajaSeguridad', 'C_caja');

    IF NOT EXISTS (
      SELECT 1 FROM @Permitidas WHERE T_tabla = @T_tabla AND C_id_columna = @C_id_columna
    )
      THROW 51000, 'Tabla o columna id no permitida para escritura.', 1;

    IF ISJSON(@D_payload) <> 1
      THROW 51001, 'Payload JSON invalido.', 1;

    DECLARE @objectId INT = OBJECT_ID(QUOTENAME('dbo') + '.' + QUOTENAME(@T_tabla));
    IF @objectId IS NULL
      THROW 51002, 'Tabla no encontrada.', 1;

    DECLARE @setList NVARCHAR(MAX);

    SELECT @setList = STRING_AGG(
      QUOTENAME(j.[key]) + ' = JSON_VALUE(@payload, ''$."' + REPLACE(j.[key], '''', '''''') + '"'')',
      ', '
    )
    FROM OPENJSON(@D_payload) j
    INNER JOIN sys.columns c
      ON c.object_id = @objectId
     AND c.name = j.[key]
    WHERE j.[key] <> @C_id_columna;

    IF @setList IS NULL
      THROW 51004, 'No hay columnas validas para actualizar.', 1;

    DECLARE @updateSql NVARCHAR(MAX) =
      N'UPDATE dbo.' + QUOTENAME(@T_tabla) +
      N' SET ' + @setList +
      N' WHERE ' + QUOTENAME(@C_id_columna) + N' = @id; SET @rows = @@ROWCOUNT;';

    DECLARE @rows INT = 0;

    EXEC sp_executesql
      @updateSql,
      N'@id INT, @payload NVARCHAR(MAX), @rows INT OUTPUT',
      @id = @N_id,
      @payload = @D_payload,
      @rows = @rows OUTPUT;

    IF @rows = 0
      THROW 51005, 'Registro no encontrado para actualizar.', 1;

    COMMIT;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    THROW;
  END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_EliminarRegistroFinanciero
  @T_tabla SYSNAME,
  @C_id_columna SYSNAME,
  @N_id INT
AS
BEGIN
  SET NOCOUNT ON;

  BEGIN TRY
    BEGIN TRAN;

    DECLARE @Permitidas TABLE (T_tabla SYSNAME PRIMARY KEY, C_id_columna SYSNAME NOT NULL);
    INSERT INTO @Permitidas (T_tabla, C_id_columna)
    VALUES
      ('Cliente', 'C_cliente'),
      ('Cuenta', 'C_cuenta'),
      ('Credito', 'C_credito'),
      ('TarjetaCredito', 'C_tarjeta'),
      ('Transaccion', 'N_id_transaccion'),
      ('DepositoPlazo', 'C_deposito'),
      ('DepositoJudicial', 'C_dep_judicial'),
      ('Leasing', 'C_leasing'),
      ('AvalGarantia', 'C_aval'),
      ('Transferencia', 'C_transferencia'),
      ('OperacionDivisas', 'C_operacion'),
      ('Fideicomiso', 'C_fideicomiso'),
      ('UsoATM', 'C_uso_atm'),
      ('BancaEnLinea', 'C_operacion_bl'),
      ('CajaSeguridad', 'C_caja');

    IF NOT EXISTS (
      SELECT 1 FROM @Permitidas WHERE T_tabla = @T_tabla AND C_id_columna = @C_id_columna
    )
      THROW 51000, 'Tabla o columna id no permitida para escritura.', 1;

    DECLARE @deleteSql NVARCHAR(MAX) =
      N'DELETE FROM dbo.' + QUOTENAME(@T_tabla) +
      N' WHERE ' + QUOTENAME(@C_id_columna) + N' = @id; SET @rows = @@ROWCOUNT;';

    DECLARE @rows INT = 0;

    EXEC sp_executesql
      @deleteSql,
      N'@id INT, @rows INT OUTPUT',
      @id = @N_id,
      @rows = @rows OUTPUT;

    IF @rows = 0
      THROW 51006, 'Registro no encontrado para eliminar.', 1;

    COMMIT;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    THROW;
  END CATCH
END;
GO
