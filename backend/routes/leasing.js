const { createFinancialCrudRouter } = require('./_financialCrud');

module.exports = createFinancialCrudRouter({
  table: 'Leasing',
  idColumn: 'C_leasing',
  idAlias: 'id_leasing',
  orderBy: 'C_leasing',
  columns: [
    { name: 'C_leasing', alias: 'id_leasing', type: 'int' },
    { name: 'C_cliente', alias: 'id_cliente', type: 'int', required: true },
    { name: 'D_num_contrato', alias: 'numero_contrato', type: 'nvarchar', required: true },
    { name: 'D_desc_bien', alias: 'descripcion_bien', type: 'nvarchar', required: true },
    { name: 'C_moneda', alias: 'moneda', type: 'tinyint', required: true },
    { name: 'M_valor_bien', alias: 'valor_bien', type: 'decimal', required: true },
    { name: 'M_saldo_pendiente', alias: 'saldo_pendiente', type: 'decimal', required: true },
    { name: 'M_cuota_mensual', alias: 'cuota_mensual', type: 'decimal', required: true },
    { name: 'M_tasa_interes', alias: 'tasa_interes', type: 'decimal', required: true },
    { name: 'Q_plazo_meses', alias: 'plazo_meses', type: 'int', required: true },
    { name: 'F_inicio', alias: 'fecha_inicio', type: 'date', required: true },
    { name: 'F_fin', alias: 'fecha_fin', type: 'date', required: true },
    { name: 'M_valor_residual', alias: 'valor_residual', type: 'decimal', required: true },
    { name: 'D_estado', alias: 'estado', type: 'nvarchar', required: true },
  ],
  defaults: {
    C_moneda: 1,
    M_tasa_interes: 0.18,
    Q_plazo_meses: 60,
    F_inicio: () => new Date().toISOString().slice(0, 10),
    F_fin: (p) => {
      const d = new Date(p.F_inicio || new Date());
      d.setMonth(d.getMonth() + Number(p.Q_plazo_meses || 60));
      return d.toISOString().slice(0, 10);
    },
    M_saldo_pendiente: (p) => p.M_valor_bien,
    M_cuota_mensual: (p) => Number(p.M_valor_bien || 0) / Number(p.Q_plazo_meses || 60),
    M_valor_residual: (p) => Number(p.M_valor_bien || 0) * 0.1,
    D_estado: 'Activo',
  },
});
