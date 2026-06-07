const { createFinancialCrudRouter } = require('./_financialCrud');

module.exports = createFinancialCrudRouter({
  table: 'OperacionDivisas',
  idColumn: 'C_operacion',
  idAlias: 'id_operacion',
  orderBy: 'C_operacion',
  columns: [
    { name: 'C_operacion', alias: 'id_operacion', type: 'int' },
    { name: 'C_cliente', alias: 'id_cliente', type: 'int', required: true },
    { name: 'T_tipo_operacion', alias: 'tipo_operacion', type: 'nvarchar', required: true },
    { name: 'C_moneda_origen', alias: 'moneda_origen', type: 'tinyint', required: true },
    { name: 'M_monto_origen', alias: 'monto_origen', type: 'decimal', required: true },
    { name: 'C_moneda_destino', alias: 'moneda_destino', type: 'tinyint', required: true },
    { name: 'M_monto_destino', alias: 'monto_destino', type: 'decimal', required: true },
    { name: 'M_tipo_cambio', alias: 'tipo_cambio', type: 'decimal', required: true },
    { name: 'F_operacion', alias: 'fecha_operacion', type: 'datetime', required: true },
    { name: 'M_comision_cobrada', alias: 'comision_cobrada', type: 'decimal', required: true },
    { name: 'M_ganancia_entidad', alias: 'ganancia_entidad', type: 'decimal', required: true },
  ],
  defaults: {
    T_tipo_operacion: 'Compra',
    C_moneda_origen: 1,
    C_moneda_destino: 2,
    M_tipo_cambio: 520,
    M_monto_destino: (p) => Number(p.M_monto_origen || 0) / Number(p.M_tipo_cambio || 520),
    F_operacion: () => new Date(),
    M_comision_cobrada: 0,
    M_ganancia_entidad: 0,
  },
});
