const { createFinancialCrudRouter } = require('./_financialCrud');

module.exports = createFinancialCrudRouter({
  table: 'UsoATM',
  idColumn: 'C_uso_atm',
  idAlias: 'id_uso_atm',
  orderBy: 'C_uso_atm',
  columns: [
    { name: 'C_uso_atm', alias: 'id_uso_atm', type: 'int' },
    { name: 'C_cliente', alias: 'id_cliente', type: 'int', required: true },
    { name: 'C_cuenta', alias: 'id_cuenta', type: 'int', required: true },
    { name: 'D_codigo_atm', alias: 'codigo_atm', type: 'nvarchar', required: true },
    { name: 'D_ubicacion_atm', alias: 'ubicacion_atm', type: 'nvarchar' },
    { name: 'C_moneda', alias: 'moneda', type: 'tinyint', required: true },
    { name: 'M_monto', alias: 'monto', type: 'decimal', required: true },
    { name: 'T_tipo_operacion', alias: 'tipo_operacion', type: 'nvarchar', required: true },
    { name: 'M_comision_cobrada', alias: 'comision_cobrada', type: 'decimal', required: true },
    { name: 'M_ganancia_entidad', alias: 'ganancia_entidad', type: 'decimal', required: true },
    { name: 'F_operacion', alias: 'fecha_operacion', type: 'datetime', required: true },
  ],
  defaults: {
    D_ubicacion_atm: 'Sucursal central',
    C_moneda: 1,
    T_tipo_operacion: 'Retiro',
    M_comision_cobrada: 0,
    M_ganancia_entidad: 0,
    F_operacion: () => new Date(),
  },
});
