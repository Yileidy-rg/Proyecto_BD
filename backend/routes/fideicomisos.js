const { createFinancialCrudRouter } = require('./_financialCrud');

module.exports = createFinancialCrudRouter({
  table: 'Fideicomiso',
  idColumn: 'C_fideicomiso',
  idAlias: 'id_fideicomiso',
  orderBy: 'C_fideicomiso',
  columns: [
    { name: 'C_fideicomiso', alias: 'id_fideicomiso', type: 'int' },
    { name: 'C_cliente', alias: 'id_cliente', type: 'int', required: true },
    { name: 'D_num_contrato', alias: 'numero_contrato', type: 'nvarchar', required: true },
    { name: 'D_objeto', alias: 'objeto', type: 'nvarchar', required: true },
    { name: 'C_moneda', alias: 'moneda', type: 'tinyint', required: true },
    { name: 'M_valor_aportado', alias: 'valor_aportado', type: 'decimal', required: true },
    { name: 'M_valor_actual', alias: 'valor_actual', type: 'decimal', required: true },
    { name: 'D_beneficiario', alias: 'beneficiario', type: 'nvarchar', required: true },
    { name: 'F_constitucion', alias: 'fecha_constitucion', type: 'date', required: true },
    { name: 'F_vencimiento', alias: 'fecha_vencimiento', type: 'date' },
    { name: 'D_estado', alias: 'estado', type: 'nvarchar', required: true },
  ],
  defaults: {
    D_objeto: 'Administracion patrimonial',
    C_moneda: 1,
    M_valor_actual: (p) => p.M_valor_aportado,
    D_beneficiario: 'Beneficiario general',
    F_constitucion: () => new Date().toISOString().slice(0, 10),
    D_estado: 'Activo',
  },
});
