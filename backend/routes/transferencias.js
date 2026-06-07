const { createFinancialCrudRouter } = require('./_financialCrud');

module.exports = createFinancialCrudRouter({
  table: 'Transferencia',
  idColumn: 'C_transferencia',
  idAlias: 'id_transferencia',
  orderBy: 'C_transferencia',
  columns: [
    { name: 'C_transferencia', alias: 'id_transferencia', type: 'int' },
    { name: 'C_cliente', alias: 'id_cliente', type: 'int', required: true },
    { name: 'C_tipo_producto', alias: 'tipo_producto', type: 'tinyint', required: true },
    { name: 'D_num_referencia', alias: 'numero_referencia', type: 'nvarchar', required: true },
    { name: 'C_moneda', alias: 'moneda', type: 'tinyint', required: true },
    { name: 'M_monto', alias: 'monto', type: 'decimal', required: true },
    { name: 'C_moneda_destino', alias: 'moneda_destino', type: 'tinyint' },
    { name: 'M_monto_destino', alias: 'monto_destino', type: 'decimal' },
    { name: 'T_tipo_canal', alias: 'tipo_canal', type: 'nvarchar' },
    { name: 'D_banco_origen', alias: 'banco_origen', type: 'nvarchar' },
    { name: 'D_banco_destino', alias: 'banco_destino', type: 'nvarchar' },
    { name: 'C_pais_destino', alias: 'pais_destino', type: 'smallint' },
    { name: 'F_transaccion', alias: 'fecha_transaccion', type: 'datetime', required: true },
    { name: 'M_comision_cobrada', alias: 'comision_cobrada', type: 'decimal', required: true },
    { name: 'D_estado', alias: 'estado', type: 'nvarchar', required: true },
  ],
  defaults: {
    C_tipo_producto: 13,
    C_moneda: 1,
    T_tipo_canal: 'Web',
    F_transaccion: () => new Date(),
    M_comision_cobrada: 0,
    D_estado: 'Activa',
  },
});
