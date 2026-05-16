CREATE OR ALTER PROCEDURE dbo.sp_BuscarClientesInteligente
  @Texto NVARCHAR(150) = NULL,
  @ProvinciaID INT = NULL,
  @CantonID INT = NULL,
  @DistritoID INT = NULL
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @q NVARCHAR(160) = '%' + ISNULL(@Texto, '') + '%';

  SELECT TOP 50
    c.ClienteID,
    c.Identificacion,
    CONCAT(c.Nombre, ' ', ISNULL(c.Apellido1,''), ' ', ISNULL(c.Apellido2,'')) AS NombreCompleto,
    c.ProvinciaID,
    c.CantonID,
    c.DistritoID,
    Relevancia =
      CASE WHEN c.Identificacion = @Texto THEN 100 ELSE 0 END +
      CASE WHEN c.Identificacion LIKE @q THEN 50 ELSE 0 END +
      CASE WHEN CONCAT(c.Nombre, ' ', ISNULL(c.Apellido1,''), ' ', ISNULL(c.Apellido2,'')) COLLATE Latin1_General_CI_AI LIKE @q COLLATE Latin1_General_CI_AI THEN 40 ELSE 0 END +
      ISNULL((SELECT COUNT(*) FROM dbo.TRANSACCION t INNER JOIN dbo.PRODUCTO p ON p.ProductoID = t.ProductoID WHERE p.ClienteID = c.ClienteID), 0)
  FROM dbo.CLIENTE c
  WHERE (@Texto IS NULL OR @Texto = '' OR
         c.Identificacion LIKE @q OR
         CONCAT(c.Nombre, ' ', ISNULL(c.Apellido1,''), ' ', ISNULL(c.Apellido2,'')) COLLATE Latin1_General_CI_AI LIKE @q COLLATE Latin1_General_CI_AI)
    AND (@ProvinciaID IS NULL OR c.ProvinciaID = @ProvinciaID)
    AND (@CantonID IS NULL OR c.CantonID = @CantonID)
    AND (@DistritoID IS NULL OR c.DistritoID = @DistritoID)
  ORDER BY Relevancia DESC, NombreCompleto ASC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_CalcularRiesgoCliente
  @ClienteID INT
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @TipoClienteID INT, @Puntaje DECIMAL(10,2) = 0, @Nivel NVARCHAR(20);

    SELECT @TipoClienteID = TipoClienteID
    FROM dbo.CLIENTE
    WHERE ClienteID = @ClienteID;

    /* Ejemplo ajustable: cambiar reglas según Catálogo CICAC */
    SELECT @Puntaje = @Puntaje +
      CASE
        WHEN DATEDIFF(YEAR, FechaNacimiento, GETDATE()) BETWEEN 18 AND 33 THEN 18 * 0.33
        WHEN DATEDIFF(YEAR, FechaNacimiento, GETDATE()) BETWEEN 34 AND 50 THEN 18 * 0.66
        ELSE 18 * 0.99
      END
    FROM dbo.CLIENTE
    WHERE ClienteID = @ClienteID;

    SET @Puntaje = @Puntaje + CASE WHEN @TipoClienteID = 1 THEN 10 ELSE 20 END;

    SET @Nivel = CASE
      WHEN @Puntaje < 30 THEN 'Bajo'
      WHEN @Puntaje < 60 THEN 'Medio'
      ELSE 'Alto'
    END;

    INSERT INTO dbo.EVALUACION_RIESGO(ClienteID, PuntajeTotal, NivelRiesgo, FechaEvaluacion)
    VALUES(@ClienteID, @Puntaje, @Nivel, GETDATE());

    COMMIT TRANSACTION;
    SELECT @ClienteID AS ClienteID, @TipoClienteID AS TipoClienteID, @Puntaje AS PuntajeTotal, @Nivel AS NivelRiesgo;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH
END;
GO
