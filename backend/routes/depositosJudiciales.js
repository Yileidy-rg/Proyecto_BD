const { createFinancialCrudRouter } = require('./_financialCrud');

module.exports = createFinancialCrudRouter({
  table: 'DepositoJudicial',
  idColumn: 'C_dep_judicial',
  idAlias: 'id_deposito_judicial',
  orderBy: 'C_dep_judicial',
  columns: [
    { name: 'C_dep_judicial', alias: 'id_deposito_judicial', type: 'int' },
    { name: 'C_cliente', alias: 'id_cliente', type: 'int', required: true },
    { name: 'D_num_expediente', alias: 'numero_expediente', type: 'nvarchar', required: true },
    { name: 'D_tribunal_origen', alias: 'tribunal_origen', type: 'nvarchar', required: true },
    { name: 'C_moneda', alias: 'moneda', type: 'tinyint', required: true },
    { name: 'M_monto', alias: 'monto', type: 'decimal', required: true },
    { name: 'F_deposito', alias: 'fecha_deposito', type: 'date', required: true },
    { name: 'F_liberacion', alias: 'fecha_liberacion', type: 'date' },
    { name: 'D_estado', alias: 'estado', type: 'nvarchar', required: true },
  ],
  defaults: {
    D_tribunal_origen: 'Tribunal Central',
    C_moneda: 1,
    F_deposito: () => new Date().toISOString().slice(0, 10),
    D_estado: 'Activo',
  },
});
