const { createFinancialCrudRouter } = require('./_financialCrud');

module.exports = createFinancialCrudRouter({
  table: 'AvalGarantia',
  idColumn: 'C_aval',
  idAlias: 'id_aval',
  orderBy: 'C_aval',
  columns: [
    { name: 'C_aval', alias: 'id_aval', type: 'int' },
    { name: 'C_cliente', alias: 'id_cliente', type: 'int', required: true },
    { name: 'D_num_documento', alias: 'numero_documento', type: 'nvarchar', required: true },
    { name: 'T_tipo_garantia', alias: 'tipo_garantia', type: 'nvarchar', required: true },
    { name: 'D_beneficiario', alias: 'beneficiario', type: 'nvarchar', required: true },
    { name: 'C_moneda', alias: 'moneda', type: 'tinyint', required: true },
    { name: 'M_monto_garantizado', alias: 'monto_garantizado', type: 'decimal', required: true },
    { name: 'F_emision', alias: 'fecha_emision', type: 'date', required: true },
    { name: 'F_vencimiento', alias: 'fecha_vencimiento', type: 'date', required: true },
    { name: 'D_cuenta_contable', alias: 'cuenta_contable', type: 'nvarchar' },
    { name: 'D_estado', alias: 'estado', type: 'nvarchar', required: true },
  ],
  defaults: {
    T_tipo_garantia: 'Garantia bancaria',
    D_beneficiario: 'Beneficiario general',
    C_moneda: 1,
    F_emision: () => new Date().toISOString().slice(0, 10),
    F_vencimiento: () => {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      return d.toISOString().slice(0, 10);
    },
    D_estado: 'Activo',
  },
});
