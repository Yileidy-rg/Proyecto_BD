const express = require('express');
const router = express.Router();
const db = require('../db');
const sql = db.sql;
const {
  body,
  handleValidation,
  optionalIntBody,
  optionalNonEmptyBody,
} = require('./_validation');

const PADRON_ESCENARIO_1 = `
<Padron>
  <Cliente>
    <D_cedula>606060006</D_cedula>
    <D_nombre_1>Laura</D_nombre_1>
    <D_nombre_2>Patricia</D_nombre_2>
    <D_apellido_1>Quesada</D_apellido_1>
    <D_apellido_2>Mora</D_apellido_2>
    <C_provincia>6</C_provincia>
    <C_canton>601</C_canton>
    <C_distrito>60101</C_distrito>
  </Cliente>
  <Cliente>
    <D_cedula>707070007</D_cedula>
    <D_nombre_1>Fernando</D_nombre_1>
    <D_nombre_2>Jose</D_nombre_2>
    <D_apellido_1>Alvarado</D_apellido_1>
    <D_apellido_2>Solano</D_apellido_2>
    <C_provincia>7</C_provincia>
    <C_canton>701</C_canton>
    <C_distrito>70101</C_distrito>
  </Cliente>
  <Cliente>
    <D_cedula>808080008</D_cedula>
    <D_nombre_1>Mariana</D_nombre_1>
    <D_nombre_2>Isabel</D_nombre_2>
    <D_apellido_1>Castro</D_apellido_1>
    <D_apellido_2>Vargas</D_apellido_2>
    <C_provincia>1</C_provincia>
    <C_canton>101</C_canton>
    <C_distrito>10101</C_distrito>
  </Cliente>
  <Cliente>
    <D_cedula>909090009</D_cedula>
    <D_nombre_1>Gabriel</D_nombre_1>
    <D_nombre_2>Andres</D_nombre_2>
    <D_apellido_1>Rojas</D_apellido_1>
    <D_apellido_2>Vega</D_apellido_2>
    <C_provincia>2</C_provincia>
    <C_canton>201</C_canton>
    <C_distrito>20101</C_distrito>
  </Cliente>
  <Cliente>
    <D_cedula>101010010</D_cedula>
    <D_nombre_1>Daniela</D_nombre_1>
    <D_nombre_2>Maria</D_nombre_2>
    <D_apellido_1>Herrera</D_apellido_1>
    <D_apellido_2>Arias</D_apellido_2>
    <C_provincia>3</C_provincia>
    <C_canton>301</C_canton>
    <C_distrito>30101</C_distrito>
  </Cliente>
</Padron>`;

function leerSalidaXml(recordsets = []) {
  const resumen = recordsets?.[0]?.[0] || {};
  const xmlRecordset = recordsets.find(rs => rs?.[0]?.D_xml_sicveca || rs?.[0]?.xml);
  const erroresRecordset = recordsets.find(rs => {
    const row = rs?.[0];
    return row && !row.D_xml_sicveca && !row.xml && (row.D_bloque || row.D_cuadro || row.D_regla || row.D_detalle);
  });

  return {
    resumen,
    errores: erroresRecordset || [],
    xml: xmlRecordset?.[0]?.D_xml_sicveca || xmlRecordset?.[0]?.xml || '',
  };
}

router.get('/', (req, res) => {
  res.json({
    escenarios: [
      { id: 1, nombre: 'Insercion mensual acumulativa', endpoint: 'POST /api/escenarios/1' },
      { id: 2, nombre: '27 transacciones de abril', endpoint: 'POST /api/escenarios/2' },
      { id: 3, nombre: 'Generar XML SICVECA + validaciones', endpoint: 'POST /api/escenarios/3' },
    ],
  });
});

router.post('/1', [
  optionalIntBody('anio', { min: 2000, max: 2100 }),
  optionalIntBody('mes_inicio', { min: 1, max: 12 }),
  optionalIntBody('mes_fin', { min: 1, max: 12 }),
  body('mes_fin').custom((value, { req }) => {
    if (!value || !req.body.mes_inicio) return true;
    if (Number(value) < Number(req.body.mes_inicio)) throw new Error('mes_fin debe ser mayor o igual a mes_inicio');
    return true;
  }),
  optionalNonEmptyBody('padron_xml', { max: 200000 }),
  optionalNonEmptyBody('canal', { max: 30 }),
  optionalNonEmptyBody('usuario', { max: 60 }),
  handleValidation,
], async (req, res, next) => {
  try {
    const ahora = new Date();
    const anio = req.body?.anio ? parseInt(req.body.anio, 10) : ahora.getFullYear();
    const mesFin = req.body?.mes_fin ? parseInt(req.body.mes_fin, 10) : ahora.getMonth() + 1;
    const mesInicio = req.body?.mes_inicio ? parseInt(req.body.mes_inicio, 10) : 1;
    const padron = req.body?.padron_xml || PADRON_ESCENARIO_1;
    const canal = req.body?.canal || 'Web';
    const usuario = req.body?.usuario || 'frontend';

    const result = await db.query(`
      EXEC dbo.sp_Escenario1_InsercionMensual
        @X_padron = @padron,
        @N_anio = @anio,
        @N_mes_inicio = @mesInicio,
        @N_mes_fin = @mesFin,
        @D_canal_origen = @canal,
        @D_usuario_exec = @usuario;
    `, [
      { name: 'padron', type: sql.NVarChar(sql.MAX), value: padron },
      { name: 'anio', type: sql.Int, value: anio },
      { name: 'mesInicio', type: sql.Int, value: mesInicio },
      { name: 'mesFin', type: sql.Int, value: mesFin },
      { name: 'canal', type: sql.NVarChar(30), value: canal },
      { name: 'usuario', type: sql.NVarChar(60), value: usuario },
    ]);

    res.json({
      message: `Escenario 1 ejecutado desde SP (${anio}, meses ${mesInicio}-${mesFin})`,
      data: result.recordset || [],
    });
  } catch (err) {
    next(err);
  }
});

router.post('/2', handleValidation, async (req, res, next) => {
  try {
    const result = await db.query('EXEC dbo.sp_Escenario2;');
    res.json({
      message: 'Escenario 2 ejecutado desde SP',
      data: result.recordset || [],
    });
  } catch (err) {
    next(err);
  }
});

router.post('/3', [
  optionalIntBody('anio', { min: 2000, max: 2100 }),
  optionalIntBody('trimestre', { min: 1, max: 4 }),
  optionalNonEmptyBody('cedula_entidad', { max: 15 }),
  optionalIntBody('tipo_carga', { min: 1, max: 9 }),
  optionalIntBody('moneda', { min: 1, max: 255 }),
  body('datos_malos')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage('datos_malos debe ser booleano')
    .toBoolean(),
  handleValidation,
], async (req, res, next) => {
  try {
    const hoy = new Date();
    const anio = req.body?.anio ? parseInt(req.body.anio, 10) : hoy.getFullYear();
    const trimestre = req.body?.trimestre
      ? parseInt(req.body.trimestre, 10)
      : Math.floor(hoy.getMonth() / 3) + 1;
    const incluirDatosMalos = ['1', 'true', 'si', 'sí'].includes(String(req.body?.datos_malos || '').toLowerCase());

    const result = await db.query(`
      EXEC dbo.sp_GenerarXML_LegitimacionRiesgos
        @N_anio = @anio,
        @N_trimestre = @trimestre,
        @D_cedula_entidad = @cedulaEntidad,
        @T_tipo_carga = @tipoCarga,
        @C_tipo_moneda = @moneda,
        @B_incluir_datos_malos = @datosMalos;
    `, [
      { name: 'anio', type: sql.Int, value: anio },
      { name: 'trimestre', type: sql.Int, value: trimestre },
      { name: 'cedulaEntidad', type: sql.NVarChar(15), value: req.body?.cedula_entidad || '3101999002' },
      { name: 'tipoCarga', type: sql.TinyInt, value: req.body?.tipo_carga ? parseInt(req.body.tipo_carga, 10) : 1 },
      { name: 'moneda', type: sql.TinyInt, value: req.body?.moneda ? parseInt(req.body.moneda, 10) : 1 },
      { name: 'datosMalos', type: sql.Bit, value: incluirDatosMalos },
    ]);

    const { resumen, errores, xml } = leerSalidaXml(result.recordsets);

    res.json({
      message: 'Escenario 3 ejecutado: XML SICVECA generado con estructura LegitimacionBaseRiesgos',
      data: {
        resumen,
        validaciones: {
          valido: Number(resumen.Q_errores_encontrados || 0) === 0,
          total_errores: Number(resumen.Q_errores_encontrados || 0),
          errores,
        },
        xml,
        estructura: {
          raiz: 'ArchivoSICVECA',
          bloques: [
            'Encabezado',
            'LegitimacionBaseRiesgos_Clientes',
            'LegitimacionBaseRiesgos_ClientesRiesgoAlto',
            'LegitimacionBaseRiesgos_ProductosServicios',
            'LegitimacionBaseRiesgos_CanalesDistribucion',
            'LegitimacionBaseRiesgos_ZonaGeografica',
            'LegitimacionBaseRiesgos_Monitoreo',
          ],
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
