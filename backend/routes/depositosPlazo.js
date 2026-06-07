const { createFinancialCrudRouter } = require('./_financialCrud');

module.exports = createFinancialCrudRouter({
  table: 'DepositoPlazo',
  idColumn: 'C_deposito',
  idAlias: 'id_deposito',
  orderBy: 'C_deposito',
  columns: [
    { name: 'C_deposito', alias: 'id_deposito', type: 'int' },
    { name: 'C_cliente', alias: 'id_cliente', type: 'int', required: true },
    { name: 'D_numero_cert', alias: 'numero_certificado', type: 'nvarchar', required: true },
    { name: 'C_moneda', alias: 'moneda', type: 'tinyint', required: true },
    { name: 'M_monto_principal', alias: 'monto_principal', type: 'decimal', required: true },
    { name: 'M_tasa_interes', alias: 'tasa_interes', type: 'decimal', required: true },
    { name: 'Q_plazo_dias', alias: 'plazo_dias', type: 'int', required: true },
    { name: 'F_emision', alias: 'fecha_emision', type: 'date', required: true },
    { name: 'F_vencimiento', alias: 'fecha_vencimiento', type: 'date', required: true },
    { name: 'N_cuenta_abono', alias: 'cuenta_abono', type: 'int' },
    { name: 'D_estado', alias: 'estado', type: 'nvarchar', required: true },
  ],
  defaults: {
    C_moneda: 1,
    M_tasa_interes: 0.05,
    Q_plazo_dias: 180,
    F_emision: () => new Date().toISOString().slice(0, 10),
    F_vencimiento: (p) => {
      const d = new Date(p.F_emision || new Date());
      d.setDate(d.getDate() + Number(p.Q_plazo_dias || 180));
      return d.toISOString().slice(0, 10);
    },
    D_estado: 'Activo',
  },
});
