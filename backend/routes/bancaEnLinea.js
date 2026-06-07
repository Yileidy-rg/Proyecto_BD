const { createFinancialCrudRouter } = require('./_financialCrud');

module.exports = createFinancialCrudRouter({
  table: 'BancaEnLinea',
  idColumn: 'C_operacion_bl',
  idAlias: 'id_operacion_banca',
  orderBy: 'C_operacion_bl',
  columns: [
    { name: 'C_operacion_bl', alias: 'id_operacion_banca', type: 'int' },
    { name: 'C_cliente', alias: 'id_cliente', type: 'int', required: true },
    { name: 'T_canal', alias: 'canal', type: 'nvarchar', required: true },
    { name: 'D_tipo_operacion', alias: 'tipo_operacion', type: 'nvarchar', required: true },
    { name: 'C_moneda', alias: 'moneda', type: 'tinyint' },
    { name: 'M_monto', alias: 'monto', type: 'decimal' },
    { name: 'D_descripcion', alias: 'descripcion', type: 'nvarchar' },
    { name: 'F_operacion', alias: 'fecha_operacion', type: 'datetime', required: true },
    { name: 'D_ip_origen', alias: 'ip_origen', type: 'nvarchar' },
    { name: 'D_estado', alias: 'estado', type: 'nvarchar', required: true },
  ],
  defaults: {
    T_canal: 'App movil',
    D_tipo_operacion: 'Pago servicio',
    C_moneda: 1,
    F_operacion: () => new Date(),
    D_ip_origen: '127.0.0.1',
    D_estado: 'Activa',
  },
});
