const { createFinancialCrudRouter } = require('./_financialCrud');

module.exports = createFinancialCrudRouter({
  table: 'CajaSeguridad',
  idColumn: 'C_caja',
  idAlias: 'id_caja',
  orderBy: 'C_caja',
  columns: [
    { name: 'C_caja', alias: 'id_caja', type: 'int' },
    { name: 'C_cliente', alias: 'id_cliente', type: 'int', required: true },
    { name: 'D_numero_caja', alias: 'numero_caja', type: 'nvarchar', required: true },
    { name: 'D_sucursal', alias: 'sucursal', type: 'nvarchar', required: true },
    { name: 'D_dimensiones', alias: 'dimensiones', type: 'nvarchar' },
    { name: 'M_canon_mensual', alias: 'canon_mensual', type: 'decimal', required: true },
    { name: 'F_inicio', alias: 'fecha_inicio', type: 'date', required: true },
    { name: 'F_vencimiento', alias: 'fecha_vencimiento', type: 'date' },
    { name: 'D_estado', alias: 'estado', type: 'nvarchar', required: true },
  ],
  defaults: {
    D_sucursal: 'Sucursal central',
    D_dimensiones: '30x30x50',
    F_inicio: () => new Date().toISOString().slice(0, 10),
    D_estado: 'Activa',
  },
});
