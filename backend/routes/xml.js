const express = require('express');
const router = express.Router();
const db = require('../db');
const sql = db.sql;

function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function fechaXml(v) {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return esc(v);
  return d.toISOString();
}

function validarCliente(c) {
  const errores = [];
  const cedula = String(c.cedula || '').replace(/\D/g, '');
  if (cedula.length < 9) errores.push(`[Cliente ${c.id_cliente}] Identificación inválida o incompleta`);
  if (!c.nombre_completo) errores.push(`[Cliente ${c.id_cliente}] Nombre vacío`);
  if (!c.tipo_persona) errores.push(`[Cliente ${c.id_cliente}] Tipo de persona faltante`);
  if (c.es_pep === null || c.es_pep === undefined) errores.push(`[Cliente ${c.id_cliente}] Indicador PEP faltante`);
  if (c.es_residente === null || c.es_residente === undefined) errores.push(`[Cliente ${c.id_cliente}] Indicador residente faltante`);
  return errores;
}

function validarTransaccion(t) {
  const errores = [];
  if (!t.id_transaccion) errores.push('[Transacción] ID faltante');
  if (!t.monto || Number(t.monto) <= 0) errores.push(`[Transacción ${t.id_transaccion}] Monto inválido`);
  if (!t.fecha) errores.push(`[Transacción ${t.id_transaccion}] Fecha faltante`);
  if (!t.tipo_transaccion) errores.push(`[Transacción ${t.id_transaccion}] Tipo de transacción faltante`);
  return errores;
}

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

router.get('/generar', async (req, res, next) => {
  try {
    try {
      const hoy = new Date();
      const anio = req.query.anio ? parseInt(req.query.anio, 10) : hoy.getFullYear();
      const trimestre = req.query.trimestre
        ? parseInt(req.query.trimestre, 10)
        : Math.floor(hoy.getMonth() / 3) + 1;
      const incluirDatosMalos = ['1', 'true', 'si', 'sí'].includes(String(req.query.datos_malos || '').toLowerCase());

      const sp = await db.query(`
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
        { name: 'cedulaEntidad', type: sql.NVarChar(15), value: req.query.cedula_entidad || '3101999002' },
        { name: 'tipoCarga', type: sql.TinyInt, value: req.query.tipo_carga ? parseInt(req.query.tipo_carga, 10) : 1 },
        { name: 'moneda', type: sql.TinyInt, value: req.query.moneda ? parseInt(req.query.moneda, 10) : 1 },
        { name: 'datosMalos', type: sql.Bit, value: incluirDatosMalos },
      ]);

      const { resumen, errores, xml } = leerSalidaXml(sp.recordsets);

      return res.json({
        xml,
        validaciones: {
          valido: Number(resumen.Q_errores_encontrados || 0) === 0,
          total_errores: Number(resumen.Q_errores_encontrados || 0),
          errores: errores.map(e => `${e.D_bloque || ''} ${e.D_cuadro || ''}: ${e.D_regla || e.D_detalle || ''}`.trim()),
        },
        resumen: {
          origen: 'sp_GenerarXML_LegitimacionRiesgos',
          estado: resumen.D_estado,
          periodo: resumen.D_periodo,
          entidad: resumen.D_entidad,
          clientes: resumen.Q_total_clientes,
          registros_cuadro_a: resumen.Q_registros_cuadro_A,
        },
      });
    } catch (spErr) {
      if (!spErr.message?.includes('sp_GenerarXML_LegitimacionRiesgos')) {
        throw spErr;
      }
    }

    const [clientesRes, productosRes, txRes, riesgoRes] = await Promise.all([
      db.query(`
        SELECT
          c.C_cliente AS id_cliente,
          c.D_numero_identificacion AS cedula,
          c.C_tipo_persona AS tipo_persona,
          tp.D_descripcion AS tipo_persona_desc,
          COALESCE(c.D_nombre_juridico,
            CONCAT(TRIM(ISNULL(c.D_nombre_1, '')), ' ', TRIM(ISNULL(c.D_nombre_2, '')), ' ',
                   TRIM(ISNULL(c.D_apellido_1, '')), ' ', TRIM(ISNULL(c.D_apellido_2, '')))
          ) AS nombre_completo,
          c.D_correo_electronico AS email,
          c.D_telefono AS telefono,
          c.M_ingreso_mensual AS ingreso_mensual,
          c.B_es_pep AS es_pep,
          c.B_es_sujeto_obligado AS es_sujeto_obligado,
          c.B_es_residente AS es_residente,
          pr.D_descripcion AS provincia,
          ca.D_descripcion AS canton,
          di.D_descripcion AS distrito,
          c.D_estado_cliente AS estado
        FROM dbo.Cliente c
        LEFT JOIN dbo.cat_TipoPersona tp ON tp.N_tipo_persona = c.C_tipo_persona
        LEFT JOIN dbo.cat_Provincia pr ON pr.N_provincia = c.C_provincia
        LEFT JOIN dbo.cat_Canton ca ON ca.N_canton = c.C_canton
        LEFT JOIN dbo.cat_Distrito di ON di.N_distrito = c.C_distrito
        ORDER BY c.C_cliente;
      `),
      db.query(`
        SELECT
          C_cliente AS id_cliente,
          D_producto AS producto,
          D_referencia AS referencia,
          M_saldo AS saldo,
          D_estado AS estado,
          F_inicio AS fecha_inicio
        FROM dbo.vw_ProductosPorCliente
        ORDER BY C_cliente, D_producto, D_referencia;
      `),
      db.query(`
        SELECT
          t.N_id_transaccion AS id_transaccion,
          t.C_cliente AS id_cliente,
          tt.D_descripcion AS tipo_transaccion,
          tp.D_descripcion AS tipo_producto,
          t.M_monto AS monto,
          t.D_descripcion AS descripcion,
          t.M_saldo_posterior AS saldo_posterior,
          t.F_transaccion AS fecha,
          t.T_canal AS canal,
          t.D_referencia_ext AS referencia,
          t.B_es_debito AS es_debito
        FROM dbo.Transaccion t
        LEFT JOIN dbo.cat_TipoTransaccion tt ON tt.N_tipo_transaccion = t.C_tipo_transaccion
        LEFT JOIN dbo.cat_TipoProducto tp ON tp.N_tipo_producto = t.C_tipo_producto
        ORDER BY t.F_transaccion DESC, t.N_id_transaccion DESC;
      `),
      db.query(`
        SELECT x.*
        FROM (
          SELECT
            cr.C_cliente AS id_cliente,
            cr.M_puntaje_total AS puntaje_total,
            nr.D_descripcion AS nivel_riesgo,
            cr.D_periodo AS periodo,
            cr.F_calificacion AS fecha_calificacion,
            ROW_NUMBER() OVER (PARTITION BY cr.C_cliente ORDER BY cr.F_calificacion DESC, cr.C_calificacion DESC) AS rn
          FROM dbo.CalificacionRiesgo cr
          LEFT JOIN dbo.cat_NivelRiesgo nr ON nr.N_nivel_riesgo = cr.C_nivel_riesgo
        ) x
        WHERE x.rn = 1;
      `)
    ]);

    const clientes = clientesRes.recordset;
    const productos = productosRes.recordset;
    const transacciones = txRes.recordset;
    const riesgos = riesgoRes.recordset;

    const errores = [];
    clientes.forEach(c => errores.push(...validarCliente(c)));
    transacciones.forEach(t => errores.push(...validarTransaccion(t)));

    const fecha = new Date().toISOString();
    const totalMonto = transacciones.reduce((s, t) => s + Number(t.monto || 0), 0);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<SICVECA version="2.0" fecha="${fecha}">\n`;
    xml += `  <ENCABEZADO>\n`;
    xml += `    <ENTIDAD>Grupo2_IF5100</ENTIDAD>\n`;
    xml += `    <BASE_DATOS>${esc(process.env.DB_DATABASE)}</BASE_DATOS>\n`;
    xml += `    <TOTAL_CLIENTES>${clientes.length}</TOTAL_CLIENTES>\n`;
    xml += `    <TOTAL_PRODUCTOS>${productos.length}</TOTAL_PRODUCTOS>\n`;
    xml += `    <TOTAL_TRANSACCIONES>${transacciones.length}</TOTAL_TRANSACCIONES>\n`;
    xml += `    <MONTO_TOTAL>${totalMonto.toFixed(2)}</MONTO_TOTAL>\n`;
    xml += `    <VALIDACION_ESTADO>${errores.length ? 'CON_ERRORES' : 'VALIDO'}</VALIDACION_ESTADO>\n`;
    xml += `  </ENCABEZADO>\n`;

    xml += `  <CLIENTES>\n`;
    for (const c of clientes) {
      const prods = productos.filter(p => p.id_cliente === c.id_cliente);
      const txs = transacciones.filter(t => t.id_cliente === c.id_cliente);
      const riesgo = riesgos.find(r => r.id_cliente === c.id_cliente);

      xml += `    <CLIENTE id="${c.id_cliente}">\n`;
      xml += `      <IDENTIFICACION>${esc(c.cedula)}</IDENTIFICACION>\n`;
      xml += `      <TIPO_PERSONA codigo="${esc(c.tipo_persona)}">${esc(c.tipo_persona_desc)}</TIPO_PERSONA>\n`;
      xml += `      <NOMBRE_COMPLETO>${esc(c.nombre_completo)}</NOMBRE_COMPLETO>\n`;
      xml += `      <EMAIL>${esc(c.email)}</EMAIL>\n`;
      xml += `      <TELEFONO>${esc(c.telefono)}</TELEFONO>\n`;
      xml += `      <UBICACION>\n`;
      xml += `        <PROVINCIA>${esc(c.provincia)}</PROVINCIA>\n`;
      xml += `        <CANTON>${esc(c.canton)}</CANTON>\n`;
      xml += `        <DISTRITO>${esc(c.distrito)}</DISTRITO>\n`;
      xml += `      </UBICACION>\n`;
      xml += `      <PERFIL_RIESGO>\n`;
      xml += `        <ES_PEP>${c.es_pep ? 'SI' : 'NO'}</ES_PEP>\n`;
      xml += `        <ES_SUJETO_OBLIGADO>${c.es_sujeto_obligado ? 'SI' : 'NO'}</ES_SUJETO_OBLIGADO>\n`;
      xml += `        <ES_RESIDENTE>${c.es_residente ? 'SI' : 'NO'}</ES_RESIDENTE>\n`;
      xml += `        <INGRESO_MENSUAL>${Number(c.ingreso_mensual || 0).toFixed(2)}</INGRESO_MENSUAL>\n`;
      xml += `        <PUNTAJE_TOTAL>${riesgo ? Number(riesgo.puntaje_total || 0).toFixed(2) : ''}</PUNTAJE_TOTAL>\n`;
      xml += `        <NIVEL>${esc(riesgo?.nivel_riesgo)}</NIVEL>\n`;
      xml += `        <PERIODO>${esc(riesgo?.periodo)}</PERIODO>\n`;
      xml += `      </PERFIL_RIESGO>\n`;

      xml += `      <PRODUCTOS count="${prods.length}">\n`;
      for (const p of prods) {
        xml += `        <PRODUCTO>\n`;
        xml += `          <TIPO>${esc(p.producto)}</TIPO>\n`;
        xml += `          <REFERENCIA>${esc(p.referencia)}</REFERENCIA>\n`;
        xml += `          <SALDO>${Number(p.saldo || 0).toFixed(2)}</SALDO>\n`;
        xml += `          <ESTADO>${esc(p.estado)}</ESTADO>\n`;
        xml += `          <FECHA_INICIO>${fechaXml(p.fecha_inicio)}</FECHA_INICIO>\n`;
        xml += `        </PRODUCTO>\n`;
      }
      xml += `      </PRODUCTOS>\n`;

      xml += `      <TRANSACCIONES count="${txs.length}">\n`;
      for (const t of txs) {
        xml += `        <TRANSACCION id="${t.id_transaccion}">\n`;
        xml += `          <TIPO>${esc(t.tipo_transaccion)}</TIPO>\n`;
        xml += `          <PRODUCTO>${esc(t.tipo_producto)}</PRODUCTO>\n`;
        xml += `          <MONTO>${Number(t.monto || 0).toFixed(2)}</MONTO>\n`;
        xml += `          <ES_DEBITO>${t.es_debito ? 'SI' : 'NO'}</ES_DEBITO>\n`;
        xml += `          <FECHA>${fechaXml(t.fecha)}</FECHA>\n`;
        xml += `          <CANAL>${esc(t.canal)}</CANAL>\n`;
        xml += `          <DESCRIPCION>${esc(t.descripcion)}</DESCRIPCION>\n`;
        xml += `        </TRANSACCION>\n`;
      }
      xml += `      </TRANSACCIONES>\n`;
      xml += `    </CLIENTE>\n`;
    }
    xml += `  </CLIENTES>\n`;
    xml += `</SICVECA>\n`;

    res.json({
      xml,
      validaciones: {
        valido: errores.length === 0,
        total_errores: errores.length,
        errores
      },
      resumen: {
        clientes: clientes.length,
        productos: productos.length,
        transacciones: transacciones.length,
        monto_total: Number(totalMonto.toFixed(2))
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
