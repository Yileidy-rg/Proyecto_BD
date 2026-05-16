/* Plantilla base. Ajustar nombres de columnas si el .bak usa otros nombres. */
CREATE OR ALTER PROCEDURE dbo.sp_InsertarTransaccion
  @ProductoID INT,
  @Fecha DATE,
  @Tipo NVARCHAR(30),
  @Categoria NVARCHAR(100),
  @Descripcion NVARCHAR(250),
  @Monto DECIMAL(18,2)
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRY
    BEGIN TRANSACTION;
      INSERT INTO dbo.TRANSACCION(ProductoID, Fecha, Tipo, Categoria, Descripcion, Monto)
      VALUES(@ProductoID, @Fecha, @Tipo, @Categoria, @Descripcion, @Monto);

      IF @Tipo = 'INGRESO'
        UPDATE c SET Saldo = Saldo + @Monto
        FROM dbo.CUENTA c WHERE c.ProductoID = @ProductoID;
      ELSE IF @Tipo = 'EGRESO'
        UPDATE c SET Saldo = Saldo - @Monto
        FROM dbo.CUENTA c WHERE c.ProductoID = @ProductoID;

    COMMIT TRANSACTION;
    SELECT SCOPE_IDENTITY() AS TransaccionID;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_ActualizarTransaccion
  @TransaccionID INT,
  @ProductoID INT,
  @Fecha DATE,
  @Tipo NVARCHAR(30),
  @Categoria NVARCHAR(100),
  @Descripcion NVARCHAR(250),
  @Monto DECIMAL(18,2)
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRY
    BEGIN TRANSACTION;
      UPDATE dbo.TRANSACCION
      SET ProductoID=@ProductoID, Fecha=@Fecha, Tipo=@Tipo, Categoria=@Categoria, Descripcion=@Descripcion, Monto=@Monto
      WHERE TransaccionID=@TransaccionID;
    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_EliminarTransaccion
  @TransaccionID INT
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM dbo.TRANSACCION WHERE TransaccionID=@TransaccionID;
END;
GO
