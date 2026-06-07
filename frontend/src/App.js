import React, { useState, useEffect, useCallback, useRef } from 'react';

// ── API ───────────────────────────────────────────────────────────────────────
const BASE = 'http://localhost:4000/api';

const apiFetch = async (path, opts = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
};

const API = {
  get:    (p)       => apiFetch(p),
  post:   (p, body) => apiFetch(p, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (p, body) => apiFetch(p, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (p)       => apiFetch(p, { method: 'DELETE' }),
};

// ── Paleta fondo claro ────────────────────────────────────────────────────────
const C = {
  bg:         '#eef3f8',
  surface:    '#ffffff',
  surfaceAlt: '#f7f9fc',
  border:     '#dde6ef',
  borderDark: '#cbd5e1',
  accent:     '#2563eb',
  accentLight:'#dbeafe',
  success:    '#16a34a',
  successBg:  '#dcfce7',
  warning:    '#d97706',
  warningBg:  '#fef3c7',
  danger:     '#dc2626',
  dangerBg:   '#fee2e2',
  text:       '#0f172a',
  textMid:    '#40566f',
  textMuted:  '#8a9ab0',
  sidebar:    '#172033',
  sidebarHov: '#22304a',
  sidebarAct: '#2f6fed',
  sidebarTxt: '#d7e1ee',
};

const RIESGO_C = { BAJO: '#16a34a', MEDIO: '#d97706', ALTO: '#dc2626' };
const RIESGO_BG= { BAJO: '#dcfce7', MEDIO: '#fef3c7', ALTO: '#fee2e2' };

const fmt     = (n) => new Intl.NumberFormat('es-CR', { style:'currency', currency:'CRC', minimumFractionDigits:0 }).format(n||0);
const fmtDate = (d) => { try { return d ? new Date(d).toLocaleDateString('es-CR') : '—'; } catch { return '—'; } };

// ── Atoms ─────────────────────────────────────────────────────────────────────

const BienvenidaClientes = () => (
  <div style={{ textAlign:'center', padding:'56px 28px', color:C.textMid }}>
    <div style={{ width:56, height:56, margin:'0 auto 18px', borderRadius:14, background:C.accentLight, color:C.accent, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:18 }}>SC</div>
    <div style={{ fontSize:24, lineHeight:1.25, fontWeight:900, color:C.text, marginBottom:10 }}>SICVECA</div>
    <div style={{ fontSize:15, color:C.textMuted, marginBottom:24 }}>Sistema de Control y Verificacion de Clientes</div>
    <div style={{ display:'flex', justifyContent:'center', gap:10, flexWrap:'wrap', marginBottom:24 }}>
      {['Carlos Rodriguez','Darnell Estrada','Meylin Lopez','Reychell Acuna', 'Yileidy Rivera'].map(nombre => (
        <span key={nombre} style={{ background:C.surfaceAlt, color:C.textMid, border:`1px solid ${C.border}`, borderRadius:20, padding:'7px 14px', fontSize:13, fontWeight:650 }}>{nombre}</span>
      ))}
    </div>
    <div style={{ fontSize:14, color:C.textMuted }}>Escriba un nombre, cedula o ubicacion para iniciar la busqueda.</div>
  </div>
);

const Spinner = () => (
  <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
    <div style={{ width:32, height:32, border:`3px solid ${C.border}`, borderTopColor:C.accent, borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

const ErrorBox = ({ msg, onRetry }) => (
  <div style={{ background:C.dangerBg, border:`1px solid ${C.danger}30`, borderRadius:10, padding:'14px 18px', color:C.danger, fontSize:14, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
    <span>{msg}</span>
    {onRetry && <button onClick={onRetry} style={{ background:C.danger, color:'#fff', border:'none', borderRadius:8, padding:'7px 12px', cursor:'pointer', fontSize:13, fontWeight:750 }}>Reintentar</button>}
  </div>
);

const EmptyState = ({ icon='--', msg='Sin datos registrados' }) => (
  <div style={{ textAlign:'center', padding:'48px 24px', color:C.textMuted }}>
    <div style={{ width:48, height:48, margin:'0 auto 14px', borderRadius:14, background:C.surfaceAlt, border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:900 }}>{icon}</div>
    <div style={{ fontSize:15 }}>{msg}</div>
  </div>
);



const Badge = ({ color, bg, children }) => (
  <span style={{ background: bg||color+'20', color, border:`1px solid ${color}40`, borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:700, whiteSpace:'nowrap' }}>
    {children}
  </span>
);

const Card = ({ children, style={} }) => (
  <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, boxShadow:'0 8px 22px #0f172a0d', ...style }}>
    {children}
  </div>
);

const SectionHeader = ({ title, action }) => (
  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22, gap:16, flexWrap:'wrap' }}>
    <h2 style={{ margin:0, fontSize:26, lineHeight:1.2, fontWeight:850, color:C.text, letterSpacing:0 }}>{title}</h2>
    {action}
  </div>
);

const Btn = ({ onClick, variant='primary', disabled, children, small, type='button' }) => {
  const styles = {
    primary:   { background:C.accent,   color:'#fff', border:`1px solid ${C.accent}` },
    danger:    { background:C.danger,   color:'#fff', border:`1px solid ${C.danger}` },
    secondary: { background:C.surface,  color:C.accent, border:`1px solid ${C.accent}` },
    success:   { background:C.success,  color:'#fff', border:`1px solid ${C.success}` },
    ghost:     { background:'transparent', color:C.textMid, border:`1px solid ${C.border}` },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ ...styles[variant], borderRadius:8, padding: small ? '6px 10px' : '11px 18px',
        fontSize: small ? 12 : 15, lineHeight:1.2, fontWeight:750, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1, transition:'all 0.15s', fontFamily:'inherit', whiteSpace:'nowrap',
        boxShadow: variant === 'primary' || variant === 'success' ? '0 8px 18px #1d4ed820' : 'none' }}
    >{children}</button>
  );
};

const Input = ({ label, value, onChange, type='text', placeholder, required, style={} }) => (
  <div style={{ marginBottom:15, ...style }}>
    {label && <label style={{ display:'block', fontSize:13, color:C.textMid, marginBottom:6, fontWeight:650 }}>{label}{required && <span style={{ color:C.danger }}> *</span>}</label>}
    <input type={type} value={value||''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width:'100%', background:C.surface, border:`1px solid ${C.borderDark}`, borderRadius:8, padding:'11px 12px',
        color:C.text, fontSize:15, outline:'none', boxSizing:'border-box', fontFamily:'inherit',
        transition:'border-color 0.15s' }}
      onFocus={e => e.target.style.borderColor=C.accent}
      onBlur={e  => e.target.style.borderColor=C.borderDark}
    />
  </div>
);

const Select = ({ label, value, onChange, options, required }) => (
  <div style={{ marginBottom:15 }}>
    {label && <label style={{ display:'block', fontSize:13, color:C.textMid, marginBottom:6, fontWeight:650 }}>{label}{required && <span style={{ color:C.danger }}> *</span>}</label>}
    <select value={value||''} onChange={e => onChange(e.target.value)}
      style={{ width:'100%', background:C.surface, border:`1px solid ${C.borderDark}`, borderRadius:8,
        padding:'11px 12px', color:C.text, fontSize:15, fontFamily:'inherit', cursor:'pointer' }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const Table = ({ cols, rows, loading, error, onRetry, emptyMsg, emptyIcon, emptyComponent }) => {
  if (loading) return <Spinner />;
  if (error)   return <div style={{ padding:16 }}><ErrorBox msg={error} onRetry={onRetry} /></div>;
  if (!rows?.length) return emptyComponent || <EmptyState msg={emptyMsg} icon={emptyIcon} />;
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
        <thead>
          <tr style={{ background:C.surfaceAlt }}>
            {cols.map(c => (
              <th key={c.key} style={{ padding:'12px 16px', textAlign:'left', color:C.textMid, fontWeight:750,
                borderBottom:`1px solid ${C.border}`, whiteSpace:'nowrap', fontSize:12, letterSpacing:0,
                textTransform:'uppercase' }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom:`1px solid ${C.border}` }}
              onMouseOver={e => e.currentTarget.style.background=C.surfaceAlt}
              onMouseOut={e  => e.currentTarget.style.background='transparent'}>
              {cols.map(c => (
                <td key={c.key} style={{ padding:'12px 16px', color:C.text, verticalAlign:'middle', lineHeight:1.45 }}>
                  {c.render ? c.render(row) : (row[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Modal = ({ open, onClose, title, children, width=520 }) => {
  if (!open) return null;
  return (
    <div style={{ position:'fixed', inset:0, background:'#00000055', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:C.surface, borderRadius:16, boxShadow:'0 20px 60px #0000002a', maxWidth:width, width:'100%', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px 24px', borderBottom:`1px solid ${C.border}` }}>
          <h3 style={{ margin:0, fontSize:17, fontWeight:800, color:C.text }}>{title}</h3>
          <button onClick={onClose} style={{ background:C.surfaceAlt, border:`1px solid ${C.border}`, color:C.textMid, width:32, height:32, borderRadius:8, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
        </div>
        <div style={{ padding:'20px 24px' }}>{children}</div>
      </div>
    </div>
  );
};

const Toast = ({ msg, type, onClear }) => {
  useEffect(() => {
    if (msg) { const t = setTimeout(onClear, 4000); return () => clearTimeout(t); }
  }, [msg]);
  if (!msg) return null;
  const bg = type === 'error' ? C.danger : C.success;
  return (
    <div style={{ position:'fixed', bottom:24, right:24, background:bg, color:'#fff', borderRadius:10,
      padding:'13px 20px', fontWeight:700, fontSize:14, zIndex:9999, maxWidth:380,
      boxShadow:'0 4px 20px #0000003a', display:'flex', alignItems:'center', gap:10 }}>
      <span>{type === 'error' ? '✕' : '✓'}</span>{msg}
    </div>
  );
};

// ── Sección Clientes ──────────────────────────────────────────────────────────
const PROVINCIAS = [
  { value:'', label:'Seleccione provincia' },
  { value:'1', label:'San José' },
  { value:'2', label:'Alajuela' },
  { value:'3', label:'Cartago' },
  { value:'4', label:'Heredia' },
  { value:'5', label:'Guanacaste' },
  { value:'6', label:'Puntarenas' },
  { value:'7', label:'Limón' },
];

const ACTIVIDADES_ECONOMICAS = [
  { value:'', label:'Seleccione actividad' },
  { value:'850000000', label:'Enseñanza' },
  { value:'620000000', label:'Programación y consultoría informática' },
  { value:'470000000', label:'Comercio al por menor' },
  { value:'640000000', label:'Servicios financieros' },
  { value:'641100000', label:'Intermediación monetaria / bancos' },
  { value:'860000000', label:'Salud humana' },
  { value:'700000000', label:'Actividades inmobiliarias' },
  { value:'840000000', label:'Administración pública' },
  { value:'960000000', label:'Servicios personales' },
  { value:'010009000', label:'Agricultura' },
  { value:'000100000', label:'Sin actividad productiva' },
];

const JUSTIFICACIONES_INGRESO = [
  { value:'', label:'Seleccione fuente de ingreso' },
  { value:'1', label:'Salario' },
  { value:'2', label:'Pensión / jubilación' },
  { value:'3', label:'Negocio propio' },
  { value:'4', label:'Alquiler de bienes' },
  { value:'5', label:'Inversiones' },
  { value:'6', label:'Remesas del exterior' },
  { value:'7', label:'Herencia / donación' },
  { value:'8', label:'Subsidio estatal' },
  { value:'9', label:'Otro' },
];

const SI_NO = [
  { value:'0', label:'No' },
  { value:'1', label:'Sí' },
];

const RESIDENTE_OPCIONES = [
  { value:'1', label:'Sí, residente en Costa Rica' },
  { value:'0', label:'No residente' },
];

const FORM_CLIENTE_INIT = {
  nombre:'', primer_apellido:'', segundo_apellido:'', cedula:'', email:'', telefono:'', fecha_nacimiento:'', tipo_cliente:'1',
  provincia:'', actividad_economica:'', justificacion_ingreso:'', ingreso_mensual:'', es_pep:'0', es_sujeto_obligado:'0', es_residente:'1'
};

  function Clientes({ toast, setSection, setRiesgoId }) {
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const [search, setSearch]     = useState('');
  const [sugg, setSugg]         = useState([]);
  const [filtered, setFiltered] = useState(null); // null = mostrar todos

  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState(FORM_CLIENTE_INIT);
  const [editId, setEditId]     = useState(null);
  const [saving, setSaving]     = useState(false);

  const timerRef = useRef();

  const clean = (value) => (value ?? '').toString().trim();

  const mapClienteBusqueda = (s) => ({
    id_cliente: s.C_cliente ?? s.id_cliente,
    nombre: clean(s.D_nombre_1 ?? s.nombre),
    segundo_nombre: clean(s.D_nombre_2 ?? s.segundo_nombre),
    primer_apellido: clean(s.D_apellido_1 ?? s.primer_apellido),
    segundo_apellido: clean(s.D_apellido_2 ?? s.segundo_apellido),
    cedula: clean(s.D_numero_identificacion ?? s.cedula),
    email: clean(s.D_correo_electronico ?? s.email),
    telefono: clean(s.D_telefono ?? s.telefono),
    fecha_nacimiento: s.F_nacimiento_const ?? s.fecha_nacimiento ?? '',
    tipo_cliente: s.C_tipo_persona ?? s.tipo_cliente ?? 1,
    provincia: s.C_provincia ?? s.provincia ?? '',
    canton: s.C_canton ?? s.canton ?? '',
    distrito: s.C_distrito ?? s.distrito ?? '',
    actividad_economica: s.D_cod_actividad ?? s.actividad_economica ?? '',
    justificacion_ingreso: s.C_justificacion_ingreso ?? s.justificacion_ingreso ?? '',
    ingreso_mensual: s.M_ingreso_mensual ?? s.ingreso_mensual ?? '',
    es_pep: s.B_es_pep ?? s.es_pep,
    es_sujeto_obligado: s.B_es_sujeto_obligado ?? s.es_sujeto_obligado,
    es_residente: s.B_es_residente ?? s.es_residente,
    estado: clean(s.D_estado_cliente ?? s.estado),
    D_nombre_completo: clean(s.D_nombre_completo),
    lugar: [s.D_provincia, s.D_canton, s.D_distrito].map(clean).filter(Boolean).join(', '),
    original: s,
  });

  
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await API.get('/clientes');
      setRows(r.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // useEffect(() => { load(); }, [load]); 

  const onSearch = (v) => {
  setSearch(v);
  clearTimeout(timerRef.current);

  if (!v.trim()) {
    setSugg([]);
    setFiltered(null);
    setClienteSeleccionado(null);
    return;
  }

  setClienteSeleccionado(null);

  timerRef.current = setTimeout(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await API.get(
        `/clientes/buscar/inteligente?termino=${encodeURIComponent(v.trim())}&limite=20`
      );

      const data = Array.isArray(r.data) ? r.data : [];

      const mapeados = data.map(mapClienteBusqueda);

      setSugg(data);
      setFiltered(mapeados);
    } catch (e) {
      console.error(e);
      setError(e.message);
      setSugg([]);
      setFiltered([]);
    } finally {
      setLoading(false);
    }
  }, 300);
};

  // ✅ FIX 2: al seleccionar sugerencia, filtrar la tabla con ese cliente
  const selectClient = (c) => {
    const mapped = mapClienteBusqueda(c);
    const fullName = mapped.D_nombre_completo || `${mapped.nombre} ${mapped.primer_apellido} ${mapped.segundo_apellido}`.trim();
    setSearch(fullName);
    setSugg([]);
    setClienteSeleccionado(c);
    setFiltered([mapped]); // muestra solo ese cliente en la tabla
  };

  const clearSearch = () => {
    setSearch('');
    setSugg([]);
    setFiltered(null);
    setClienteSeleccionado(null);
  };

  const openCreate = () => { setForm(FORM_CLIENTE_INIT); setEditId(null); setModal(true); };

  const openEdit = (r) => {
    setForm({
      nombre: r.nombre || '',
      primer_apellido: r.primer_apellido || '',
      segundo_apellido: r.segundo_apellido || '',
      cedula: r.cedula || '',
      email: r.email || '',
      telefono: r.telefono || '',
      fecha_nacimiento: r.fecha_nacimiento ? r.fecha_nacimiento.split('T')[0] : '',
      tipo_cliente: String(r.tipo_cliente || 1),
      provincia: String(r.provincia || ''),
      actividad_economica: r.actividad_economica || '',
      justificacion_ingreso: String(r.justificacion_ingreso || ''),
      ingreso_mensual: r.ingreso_mensual ?? '',
      es_pep: String(Number(Boolean(r.es_pep))),
      es_sujeto_obligado: String(Number(Boolean(r.es_sujeto_obligado))),
      es_residente: String(Number(r.es_residente ?? 1)),
    });
    setEditId(r.id_cliente);
    setModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este cliente?')) return;
    try {
      await API.delete(`/clientes/${id}`);
      toast('Cliente eliminado', 'success');
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const handleSubmit = async () => {
    if (!form.nombre || !form.primer_apellido || !form.cedula)
      return toast('Campos requeridos', 'error');
    setSaving(true);
    try {
      const payload = {
        ...form,
        tipo_cliente: parseInt(form.tipo_cliente),
        provincia: parseInt(form.provincia),
        justificacion_ingreso: parseInt(form.justificacion_ingreso),
        ingreso_mensual: Number(form.ingreso_mensual || 0),
        es_pep: form.es_pep === '1',
        es_sujeto_obligado: form.es_sujeto_obligado === '1',
        es_residente: form.es_residente === '1',
      };
      if (editId) {
        await API.put(`/clientes/${editId}`, payload);
        toast('Cliente actualizado', 'success');
      } else {
        await API.post('/clientes', payload);
        toast('Cliente creado', 'success');
      }
      setModal(false);
      load();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // ✅ FIX 3: la tabla muestra `filtered` si hay búsqueda, si no muestra todos
  const tableRows = filtered !== null ? filtered : rows;

  return (
    <div>
      <SectionHeader
        title="Clientes"
        action={<Btn onClick={openCreate}>+ Nuevo Cliente</Btn>}
      />

      {/* 🔍 SEARCH INPUT */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <div style={{ position: 'relative' }}>
          <input
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Buscar por nombre, cedula o ubicacion"
            style={{
              width: '100%',
              padding: '14px 44px 14px 18px',
              borderRadius: 10,
              border: `1px solid ${C.borderDark}`,
              fontSize: 16,
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
              background: C.surface,
              color: C.text,
              boxShadow: '0 8px 22px #0f172a0a',
            }}
          />
          {/* Botón X para limpiar */}
          {search && (
            <button
              onClick={clearSearch}
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: C.textMuted, fontSize: 16, lineHeight: 1,
              }}
            >x</button>
          )}
        </div>

        {/* Dropdown sugerencias */}
        {sugg.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            background: '#fff', border: `1px solid ${C.border}`,
            borderRadius: 10, zIndex: 1000, marginTop: 8, maxHeight:360, overflowY:'auto',
            boxShadow: '0 18px 40px #0f172a1a'
          }}>
           {sugg.map((s, i) => (
  <div
    key={i}
   onClick={() => selectClient(s)}
    style={{
      padding: '14px 16px',
      cursor: 'pointer',
      borderBottom: `1px solid ${C.border}`
    }}
    onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
    onMouseOut={e => e.currentTarget.style.background = '#fff'}
  >
    <div style={{ fontWeight: 800, color: C.text, fontSize: 15 }}>
      {s.D_nombre_completo || '—'}
    </div>
    <div style={{ fontSize: 13, color: C.textMid, marginTop: 4 }}>
      Cédula: {s.D_numero_identificacion || '—'}
      {s.T_tipo_persona ? ` · ${s.T_tipo_persona}` : ''}
      {s.D_provincia ? ` · ${[s.D_provincia, s.D_canton, s.D_distrito].filter(Boolean).join(', ')}` : ''}
    </div>
  </div>
))}
          </div>
        )}
      </div>
      {/* 📋 TABLA */}
      {sugg.length === 0 && <Card>
        <Table
          loading={loading}
  error={error}
  onRetry={load}
  rows={tableRows}
  emptyMsg=""
  emptyIcon=""
  emptyComponent={filtered !== null ? undefined : <BienvenidaClientes />}
          cols={[
            { key: 'id_cliente', label: 'ID' },
            {
              key: 'nombre', label: 'Nombre',
              render: r => `${r.nombre || ''} ${r.primer_apellido || ''} ${r.segundo_apellido || ''}`.trim()
            },
            { key: 'cedula', label: 'Cédula' },
            { key: 'lugar', label: 'Lugar' },
            { key: 'email', label: 'Email' },
            {
              key: 'acciones', label: '',
              render: r => (
                <div style={{ display: 'flex', gap: 6 }}>
                  <Btn small variant="ghost" onClick={() => openEdit(r)}>Editar</Btn>
                  <Btn small variant="danger" onClick={() => handleDelete(r.id_cliente)}>Eliminar</Btn>
                </div>
              )
            }
          ]}
        />
        {!loading && !error && tableRows.length > 0 && (
          <div style={{ padding: '8px 14px', fontSize: 12, color: C.textMuted, borderTop: `1px solid ${C.border}` }}>
            {tableRows.length} cliente(s)
          </div>
        )}
      </Card>}

      {/* MODAL */}
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Cliente' : 'Nuevo Cliente'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <Input label="Nombre" value={form.nombre} onChange={v => f('nombre', v)} required />
          <Input label="Primer Apellido" value={form.primer_apellido} onChange={v => f('primer_apellido', v)} required />
          <Input label="Segundo Apellido" value={form.segundo_apellido} onChange={v => f('segundo_apellido', v)} />
          <Input label="Cédula" value={form.cedula} onChange={v => f('cedula', v)} required />
          <Input label="Email" type="email" value={form.email} onChange={v => f('email', v)} />
          <Input label="Teléfono" value={form.telefono} onChange={v => f('telefono', v)} />
          <Input label="Fecha Nacimiento" type="date" value={form.fecha_nacimiento} onChange={v => f('fecha_nacimiento', v)} />
          <Select label="Tipo Cliente" value={form.tipo_cliente} onChange={v => f('tipo_cliente', v)}
            options={[{ value: '1', label: 'Físico' }, { value: '2', label: 'Jurídico' }]} />
          <Select label="Provincia" value={form.provincia} onChange={v => f('provincia', v)} options={PROVINCIAS} />
          <Select label="Actividad Económica" value={form.actividad_economica} onChange={v => f('actividad_economica', v)} options={ACTIVIDADES_ECONOMICAS} />
          <Select label="Fuente de Ingreso" value={form.justificacion_ingreso} onChange={v => f('justificacion_ingreso', v)} options={JUSTIFICACIONES_INGRESO} />
          <Input label="Ingreso Mensual (₡)" type="number" value={form.ingreso_mensual} onChange={v => f('ingreso_mensual', v)} />
          <Select label="¿Es PEP?" value={form.es_pep} onChange={v => f('es_pep', v)} options={SI_NO} />
          <Select label="¿Sujeto Obligado?" value={form.es_sujeto_obligado} onChange={v => f('es_sujeto_obligado', v)} options={SI_NO} />
          <Select label="¿Es Residente?" value={form.es_residente} onChange={v => f('es_residente', v)} options={RESIDENTE_OPCIONES} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
          <Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn onClick={handleSubmit} disabled={saving}>{saving ? 'Guardando…' : editId ? 'Actualizar' : 'Crear'}</Btn>
        </div>
      </Modal>
    </div>
  );
}
// ── Sección genérica CRUD ─────────────────────────────────────────────────────
function CrudSection({ title, icon, endpoint, idField, cols, formFields, formInit, validateFn, emptyMsg, hideActions = false }) {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState(formInit);
  const [editId, setEditId]   = useState(null);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState({ msg:'', type:'' });

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const r = await API.get(`/${endpoint}`); setRows(r.data||[]); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [endpoint]);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg, type) => setToast({ msg, type });

  const openCreate = () => { setForm(formInit); setEditId(null); setModal(true); };
  const openEdit   = (r)  => {
    const mapped = {};
    formFields.forEach(f => { mapped[f.key] = r[f.key] !== undefined ? String(r[f.key]) : ''; });
    setForm(mapped); setEditId(r[idField]); setModal(true);
  };
  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este registro?')) return;
    try { await API.delete(`/${endpoint}/${id}`); showToast('Eliminado', 'success'); load(); }
    catch (e) { showToast(e.message, 'error'); }
  };

  const handleSubmit = async () => {
    if (validateFn) { const err = validateFn(form); if (err) return showToast(err, 'error'); }
    setSaving(true);
    try {
      // Convertir tipos numéricos
      const payload = {};
      formFields.forEach(f => {
        const v = form[f.key];
        payload[f.key] = (f.type === 'number' && v !== '') ? parseFloat(v) : (v || null);
      });
      if (editId) { await API.put(`/${endpoint}/${editId}`, payload); showToast('Actualizado correctamente', 'success'); }
      else        { await API.post(`/${endpoint}`, payload);           showToast('Creado correctamente', 'success'); }
      setModal(false); load();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const allCols = [
    ...cols,
    { key:'acciones', label:'', render: r => (
      <div style={{ display:'flex', gap:6 }}>
        <Btn small variant="ghost" onClick={() => openEdit(r)}>Editar</Btn>
        <Btn small variant="danger" onClick={() => handleDelete(r[idField])}>Eliminar</Btn>
      </div>
    )},
  ];

  return (
    <div>
      <SectionHeader title={title} action={<Btn onClick={openCreate}>+ Nuevo</Btn>} />
      <Card>
        <Table loading={loading} error={error} onRetry={load} cols={allCols} rows={rows}
          emptyMsg={emptyMsg||`No hay ${title.toLowerCase()} registrados`} />
        {!loading && !error && rows.length > 0 &&
          <div style={{ padding:'10px 14px', fontSize:12, color:C.textMuted, borderTop:`1px solid ${C.border}` }}>{rows.length} registro(s)</div>}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? `Editar ${title}` : `Nuevo ${title}`}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
          {formFields.map(f => (
            f.options
              ? <Select key={f.key} label={f.label} value={form[f.key]||''} onChange={v => setForm(p=>({...p,[f.key]:v}))} options={f.options} required={f.required} />
              : <Input  key={f.key} label={f.label} type={f.type||'text'} value={form[f.key]||''} onChange={v => setForm(p=>({...p,[f.key]:v}))} required={f.required} placeholder={f.placeholder} style={f.fullWidth ? { gridColumn:'1/-1' } : {}} />
          ))}
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:4, paddingTop:16, borderTop:`1px solid ${C.border}` }}>
          <Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn onClick={handleSubmit} disabled={saving}>{saving ? 'Guardando…' : editId ? 'Actualizar' : 'Crear'}</Btn>
        </div>
      </Modal>

      <Toast msg={toast.msg} type={toast.type} onClear={() => setToast({ msg:'', type:'' })} />
    </div>
  );
}

// ── Sección Transacciones ─────────────────────────────────────────────────────
const TIPOS_TX = ['DEPOSITO','RETIRO','TRANSFERENCIA','PAGO_SERVICIOS','COMPRA_SUPERMERCADO',
  'SINPE_MOVIL','PAGO_TARJETA_CREDITO','AHORRO','GASOLINA','COMIDA_RESTAURANTE',
  'GYM','INTERNET','LUZ','AGUA','CELULAR','STREAMING','ROPA','HOBBY'];

function Transacciones({ toast }) {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState({ id_producto:'', tipo_transaccion:'DEPOSITO', monto:'', descripcion:'' });
  const [saving, setSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const r = await API.get('/transacciones'); setRows(r.data||[]); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!form.id_producto || !form.monto) return toast('ID Producto y monto son requeridos', 'error');
    setSaving(true);
    try {
      await API.post('/transacciones', { ...form, id_producto: parseInt(form.id_producto), monto: parseFloat(form.monto) });
      toast('Transacción registrada', 'success');
      setModal(false);
      setForm({ id_producto:'', tipo_transaccion:'DEPOSITO', monto:'', descripcion:'' });
      load();
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const TIPO_COLOR = { DEPOSITO: C.success, RETIRO: C.danger, TRANSFERENCIA: C.accent };

  return (
    <div>
      <SectionHeader title="Movimientos" action={<Btn onClick={() => setModal(true)}>+ Nueva Transaccion</Btn>} />
      <Card>
        <Table loading={loading} error={error} onRetry={load} rows={rows}
          emptyMsg="No hay transacciones registradas" emptyIcon="TX"
          cols={[
            { key:'id_transaccion',   label:'ID' },
            { key:'id_producto',      label:'Producto' },
            { key:'tipo_transaccion', label:'Tipo', render: r => {
              const col = TIPO_COLOR[r.tipo_transaccion] || C.warning;
              return <Badge color={col} bg={col+'18'}>{r.tipo_transaccion}</Badge>;
            }},
            { key:'monto',  label:'Monto',  render: r => <strong style={{ color:C.text }}>{fmt(r.monto)}</strong> },
            { key:'fecha',  label:'Fecha',  render: r => fmtDate(r.fecha) },
            { key:'descripcion', label:'Descripción' },
          ]}
        />
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Nueva Transacción">
        <Input label="ID Producto" value={form.id_producto} onChange={v => setForm(p=>({...p,id_producto:v}))} required type="number" />
        <Select label="Tipo de Transacción" value={form.tipo_transaccion} onChange={v => setForm(p=>({...p,tipo_transaccion:v}))}
          options={TIPOS_TX.map(t=>({value:t,label:t}))} />
        <Input label="Monto (₡)" type="number" value={form.monto} onChange={v => setForm(p=>({...p,monto:v}))} required />
        <Input label="Descripción" value={form.descripcion} onChange={v => setForm(p=>({...p,descripcion:v}))} />
        <div style={{ display:'flex', justifyContent:'flex-end', gap:10, paddingTop:16, borderTop:`1px solid ${C.border}` }}>
          <Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn onClick={handleSubmit} disabled={saving}>{saving?'Registrando…':'Registrar'}</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ── Sección Riesgo ────────────────────────────────────────────────────────────
function Riesgo({ toast, clienteIdInicial }) {
  const [historial, setHistorial] = useState([]);
  const [loadingH, setLoadingH]   = useState(true);
  const [errorH, setErrorH]       = useState('');
  const [idCliente, setIdCliente] = useState(clienteIdInicial || '');
  const [resultado, setResultado] = useState(null);
  const [evaluando, setEvaluando] = useState(false);

  const loadHistorial = useCallback(async () => {

    setLoadingH(true); setErrorH('');
    try { const r = await API.get('/riesgo'); setHistorial(r.data||[]); }
    catch (e) { setErrorH(e.message); }
    finally { setLoadingH(false); }
  }, []);

  useEffect(() => { loadHistorial(); }, [loadHistorial]);

  const evaluar = async () => {
    if (!idCliente) return toast('Ingresá el ID del cliente', 'error');
    setEvaluando(true); setResultado(null);
    try {
      const r = await API.get(`/riesgo/${idCliente}`);
      setResultado(r.data);
      loadHistorial();
    } catch (e) { toast(e.message, 'error'); }
    finally { setEvaluando(false); }
  };

  return (
    <div>
      <SectionHeader title="Calificadora de Riesgo" />
      <p style={{ color:C.textMid, marginBottom:20, fontSize:14 }}>Evaluación ponderada por variables según tipo de cliente (físico/jurídico). Guarda resultado en EVALUACION_RIESGO.</p>

      <Card style={{ marginBottom:20, padding:20 }}>
        <div style={{ display:'flex', gap:12, alignItems:'flex-end' }}>
          <div style={{ flex:1 }}><Input label="ID del Cliente" value={idCliente} onChange={setIdCliente} type="number" placeholder="Ej: 1" /></div>
          <div style={{ marginBottom:14 }}>
            <Btn onClick={evaluar} disabled={evaluando||!idCliente} variant="success">
              {evaluando ? 'Calculando...' : 'Evaluar Riesgo'}
            </Btn>
          </div>
        </div>

        {resultado && (
          <div style={{ marginTop:16, padding:20, background:RIESGO_BG[resultado.nivel_riesgo]||C.surfaceAlt,
            borderRadius:10, border:`1px solid ${RIESGO_C[resultado.nivel_riesgo]||C.border}30` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:12 }}>
              <div>
                <div style={{ fontWeight:800, fontSize:18, color:C.text }}>{resultado.nombre}</div>
                <div style={{ color:C.textMid, fontSize:13 }}>{resultado.tipo_cliente} · ID {resultado.id_cliente}</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:42, fontWeight:900, color:RIESGO_C[resultado.nivel_riesgo], lineHeight:1 }}>{resultado.puntaje_total}</div>
                <div style={{ fontSize:11, color:C.textMid, marginTop:4 }}>puntos</div>
                <div style={{ marginTop:6 }}>
                  <Badge color={RIESGO_C[resultado.nivel_riesgo]} bg={RIESGO_BG[resultado.nivel_riesgo]}>
                    RIESGO {resultado.nivel_riesgo}
                  </Badge>
                </div>
              </div>
            </div>
            <div style={{ borderTop:`1px solid ${RIESGO_C[resultado.nivel_riesgo]}30`, paddingTop:12 }}>
              {(resultado.detalle_variables||[]).map((v,i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0',
                  borderBottom:`1px solid ${C.border}`, fontSize:13 }}>
                  <span style={{ color:C.text }}>{v.variable} <span style={{ color:C.textMuted, fontSize:11 }}>({String(v.valor)})</span></span>
                  <span style={{ fontWeight:700, color:RIESGO_C[resultado.nivel_riesgo] }}>+{v.puntaje} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <h3 style={{ color:C.text, marginBottom:12, fontSize:16, fontWeight:700 }}>Historial de Evaluaciones</h3>
      <Card>
        <Table loading={loadingH} error={errorH} onRetry={loadHistorial} rows={historial}
          emptyMsg="Sin evaluaciones realizadas" emptyIcon="RG"
          cols={[
            { key:'id_evaluacion',   label:'ID' },
            { key:'id_cliente',      label:'Cliente' },
            { key:'tipo_cliente',    label:'Tipo' },
            { key:'puntaje_total',   label:'Puntaje', render: r =>
              <strong style={{ color: RIESGO_C[r.nivel_riesgo]||C.text }}>{r.puntaje_total}</strong> },
            { key:'nivel_riesgo', label:'Nivel', render: r =>
              <Badge color={RIESGO_C[r.nivel_riesgo]||C.textMid} bg={RIESGO_BG[r.nivel_riesgo]||C.surfaceAlt}>
                {r.nivel_riesgo}
              </Badge> },
            { key:'fecha_evaluacion', label:'Fecha', render: r => fmtDate(r.fecha_evaluacion) },
          ]}
        />
      </Card>
    </div>
  );
}

const ESCENARIOS_CONFIG = {
  escenario1: {
    n:1,
    title:'Carga mensual',
    desc:'Genera la carga mensual automatizada de clientes, productos y transacciones acumulativas.',
    button:'Generar carga mensual',
    endpoint:'/escenarios/1',
    color:C.accent,
  },
  escenario2: {
    n:2,
    title:'Transacciones',
    desc:'Genera transacciones aleatorias de abril por cliente y producto para poblar el flujo transaccional.',
    button:'Generar transacciones',
    endpoint:'/escenarios/2',
    color:'#7c3aed',
  },
};

function Escenario({ toast, config }) {
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState(null);

  const run = async () => {
    setRunning(true);
    try {
      const r = await API.post(config.endpoint, {});
      setLog(r);
      toast(`${config.title} ejecutado correctamente`, 'success');
    } catch (e) {
      toast(`Error en ${config.title}: ${e.message}`, 'error');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      <SectionHeader title={config.title} />
      <p style={{ color:C.textMid, marginBottom:22, fontSize:16, lineHeight:1.55, maxWidth:720 }}>{config.desc}</p>

      <div style={{ display:'flex', gap:12, marginBottom:24 }}>
        <Btn onClick={run} disabled={running}>
          {running ? 'Generando...' : config.button}
        </Btn>
      </div>

      {log && (
        <div style={{ background:C.successBg, borderRadius:8, padding:'12px 14px', border:`1px solid ${C.success}30` }}>
          <div style={{ fontWeight:700, color:C.success, fontSize:13, marginBottom:6 }}>OK {log.message}</div>
          <pre style={{ margin:0, fontSize:11, color:C.textMid, maxHeight:180, overflow:'auto', whiteSpace:'pre-wrap', wordBreak:'break-word', fontFamily:'monospace' }}>
            {JSON.stringify(log.data?.slice?.(0,8)||log.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function Xml({ toast }) {
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);

  const generar = async () => {
    setLoading(true); setResult(null);
    try {
      const r = await API.post('/escenarios/3', {});
      const data = r.data || {};
      const errores = (data.validaciones?.errores || []).map(e =>
        typeof e === 'string'
          ? e
          : `${e.D_bloque || ''} ${e.D_cuadro || ''}: ${e.D_regla || e.D_detalle || ''}`.trim()
      );
      setResult({
        message: r.message,
        xml: data.xml || '',
        estructura: data.estructura,
        validaciones: {
          ...(data.validaciones || {}),
          valido: data.validaciones?.valido ?? errores.length === 0,
          total_errores: data.validaciones?.total_errores ?? errores.length,
          errores,
        },
        resumen: {
          estado: data.resumen?.D_estado,
          periodo: data.resumen?.D_periodo,
          entidad: data.resumen?.D_entidad,
          clientes: data.resumen?.Q_total_clientes,
          productos: data.resumen?.Q_total_productos_servicios,
          transacciones: data.resumen?.Q_total_transacciones,
          registros_cuadro_a: data.resumen?.Q_registros_cuadro_A,
        },
      });
      toast('XML SICVECA generado', 'success');
    }
    catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  const descargar = () => {
    if (!result?.xml) return;
    const blob = new Blob([result.xml], { type:'application/xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `SICVECA_${new Date().toISOString().split('T')[0]}.xml`;
    a.click();
  };

  return (
    <div>
      <SectionHeader title="XML SICVECA" />
      <p style={{ color:C.textMid, marginBottom:22, fontSize:16, lineHeight:1.55, maxWidth:760 }}>Genera el XML completo con la estructura de Legitimacion con Base en Riesgos y aplica sus validaciones.</p>

      <div style={{ display:'flex', gap:12, marginBottom:24 }}>
        <Btn onClick={generar} disabled={loading}>{loading ? 'Generando...' : 'Generar XML'}</Btn>
        {result && <Btn variant="success" onClick={descargar}>Descargar .xml</Btn>}
      </div>

      {result && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:12, marginBottom:20 }}>
            {[
              { label:'Clientes',      val: result.resumen?.clientes,      col: C.accent   },
              { label:'Productos',     val: result.resumen?.productos,     col: '#7c3aed'  },
              { label:'Cuadro A',      val: result.resumen?.registros_cuadro_a, col: C.success  },
              { label:'Errores',       val: result.validaciones?.total_errores, col: result.validaciones?.total_errores>0 ? C.danger : C.success },
            ].map(s => (
              <Card key={s.label} style={{ padding:'16px', textAlign:'center' }}>
                <div style={{ fontSize:30, fontWeight:900, color:s.col }}>{s.val??'—'}</div>
                <div style={{ fontSize:11, color:C.textMuted, marginTop:4, fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>{s.label}</div>
              </Card>
            ))}
          </div>

          {result.validaciones?.errores?.length > 0 ? (
            <Card style={{ marginBottom:16, padding:16, borderColor:`${C.danger}40` }}>
              <h4 style={{ color:C.danger, margin:'0 0 10px', fontSize:14 }}>Errores de Validacion</h4>
              <div style={{ maxHeight:200, overflowY:'auto' }}>
                {result.validaciones.errores.map((e,i) => (
                  <div key={i} style={{ color:C.danger, fontSize:12, padding:'3px 0' }}>
                    - {e}
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <div style={{ background:C.successBg, border:`1px solid ${C.success}40`, borderRadius:10, padding:'12px 16px', color:C.success, fontWeight:700, marginBottom:16, fontSize:14 }}>
              XML valido - sin errores de validacion SUGEF
            </div>
          )}

          <Card style={{ padding:0 }}>
            <div style={{ padding:'14px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h4 style={{ margin:0, fontSize:14, fontWeight:700, color:C.text }}>Vista previa del XML</h4>
              <span style={{ fontSize:11, color:C.textMuted }}>{result.xml?.length.toLocaleString()} caracteres</span>
            </div>
            <pre style={{ margin:0, padding:16, fontSize:11, color:'#1e40af', background:'#eff6ff',
              overflowX:'auto', maxHeight:360, fontFamily:"'Consolas','Courier New',monospace", lineHeight:1.5 }}>
              {result.xml?.substring(0,4000)}{result.xml?.length>4000?'\n\n… (truncado — descargue el archivo para verlo completo)':''}
            </pre>
          </Card>
        </>
      )}
    </div>
  );
}

// ── App principal ─────────────────────────────────────────────────────────────
const NAV = [
  { id:'clientes',      label:'Clientes',      icon:'CL' },
  { id:'productos',     label:'Productos',     icon:'PR' },
  { id:'cuentas',       label:'Cuentas',       icon:'CU' },
  { id:'prestamos',     label:'Prestamos',     icon:'CR' },
  { id:'tarjetas',      label:'Tarjetas',      icon:'TC' },
  { id:'transacciones', label:'Movimientos',   icon:'MV' },
  { id:'riesgo',        label:'Riesgo',        icon:'RG' },
  { id:'escenario1',    label:'Carga mensual', icon:'CM' },
  { id:'escenario2',    label:'Transacciones', icon:'TX' },
  { id:'xml',           label:'XML SICVECA',   icon:'XML' },
];

export default function App() {
  const [section, setSection] = useState('clientes');
  const [toast, setToast]     = useState({ msg:'', type:'' });
  const [riesgoId, setRiesgoId] = useState(''); // ← agregar esto
  const showToast = (msg, type='success') => setToast({ msg, type });

  // Campos para cada sección CRUD genérica
  const PRODUCTO_FIELDS = [
    { key:'id_cliente',    label:'ID Cliente', required:true, type:'number' },
    { key:'tipo_producto', label:'Tipo de Producto', required:true, options:[
      { value:'', label:'Seleccione producto' },
      { value:'1', label:'Cuentas a la vista' },
      { value:'2', label:'Depositos a plazo' },
      { value:'3', label:'Cuentas expediente simplificado' },
      { value:'4', label:'Cuentas planillas/servicios' },
      { value:'5', label:'Depositos judiciales' },
      { value:'6', label:'Creditos directos' },
      { value:'7', label:'Creditos hipotecarios' },
      { value:'8', label:'Tarjetas de credito' },
      { value:'9', label:'Lineas de credito' },
      { value:'10', label:'Descuento de facturas' },
      { value:'11', label:'Leasing' },
      { value:'12', label:'Avales y garantias' },
      { value:'13', label:'Transferencias de fondos' },
      { value:'14', label:'Remesas de dinero' },
      { value:'15', label:'Compra y venta de divisas' },
      { value:'16', label:'Fideicomisos' },
      { value:'17', label:'Cajeros automaticos ATM' },
      { value:'18', label:'Banca en linea/app movil' },
      { value:'19', label:'Cajas de seguridad' },
    ] },
    { key:'moneda', label:'Moneda (1=CRC)', type:'number' },
    { key:'monto', label:'Monto / Saldo inicial', type:'number' },
    { key:'plazo_meses', label:'Plazo meses', type:'number' },
    { key:'fecha_apertura', label:'Fecha Apertura', type:'date' },
    { key:'estado', label:'Estado', options:[{value:'ACTIVO',label:'ACTIVO'},{value:'INACTIVO',label:'INACTIVO'}] },
  ];

  const CUENTA_FIELDS = [
    { key:'id_producto',    label:'ID Producto',   required:true, type:'number' },
    { key:'tipo_cuenta',    label:'Tipo Cuenta',   required:true, type:'number' },
    { key:'numero_cuenta',  label:'Número Cuenta' },
    { key:'saldo',          label:'Saldo',         type:'number' },
    { key:'estado',         label:'Estado', options:[{value:'1',label:'Activa'},{value:'0',label:'Inactiva'}] },
  ];
  const PRESTAMO_FIELDS = [
    { key:'id_producto',    label:'ID Producto',    required:true, type:'number' },
    { key:'tipo_prestamo',  label:'Tipo Préstamo',  required:true, type:'number' },
    { key:'monto',          label:'Monto (₡)',       required:true, type:'number' },
    { key:'plazo_meses',    label:'Plazo (meses)',   type:'number' },
    { key:'tasa_interes',   label:'Tasa Interés %',  type:'number' },
    { key:'fecha_desembolso',label:'Fecha Desembolso',type:'date' },
    { key:'estado',         label:'Estado', options:[{value:'1',label:'Activo'},{value:'0',label:'Cancelado'}] },
  ];
  const TARJETA_FIELDS = [
    { key:'id_producto',    label:'ID Producto',     required:true, type:'number' },
    { key:'tipo_tarjeta',   label:'Tipo Tarjeta',    required:true, type:'number' },
    { key:'numero_tarjeta', label:'Número Tarjeta' },
    { key:'limite_credito', label:'Límite Crédito',  type:'number' },
    { key:'saldo_actual',   label:'Saldo Actual',    type:'number' },
    { key:'estado',         label:'Estado', options:[{value:'1',label:'Activa'},{value:'0',label:'Bloqueada'}] },
  ];

  const toInit = (fields) => Object.fromEntries(fields.map(f => [f.key, '']));

  const renderSection = () => {
    switch (section) {
      case 'clientes': return <Clientes toast={showToast} setSection={setSection} setRiesgoId={setRiesgoId} />;
      case 'transacciones': return <Transacciones toast={showToast} />;
      case 'riesgo':   return <Riesgo   toast={showToast} clienteIdInicial={riesgoId} />;
      case 'escenario1':    return <Escenario toast={showToast} config={ESCENARIOS_CONFIG.escenario1} />;
      case 'escenario2':    return <Escenario toast={showToast} config={ESCENARIOS_CONFIG.escenario2} />;
      case 'xml':           return <Xml           toast={showToast} />;
      case 'productos':     return <CrudSection endpoint="productos"  idField="id_producto"  icon="PR" title="Productos"  formFields={PRODUCTO_FIELDS} formInit={toInit(PRODUCTO_FIELDS)}
        cols={[ {key:'id_producto',label:'ID'},{key:'id_cliente',label:'Cliente'},{key:'tipo_producto_desc',label:'Producto',render:r=>r.tipo_producto_desc||r.tipo_producto},{key:'moneda',label:'Moneda'},{key:'fecha_apertura',label:'Apertura',render:r=>fmtDate(r.fecha_apertura)},{key:'estado',label:'Estado',render:r=><Badge color={r.estado==='ACTIVO'?C.success:C.textMid} bg={r.estado==='ACTIVO'?C.successBg:C.surfaceAlt}>{r.estado}</Badge>},{key:'descripcion',label:'Referencia'} ]}
        validateFn={f=>(!f.id_cliente||!f.tipo_producto)?'ID Cliente y Tipo son requeridos':null} toast={showToast} />;
      case 'cuentas':       return <CrudSection endpoint="cuentas"    idField="id_cuenta"    icon="CU" title="Cuentas"    formFields={CUENTA_FIELDS}   formInit={toInit(CUENTA_FIELDS)}
        cols={[ {key:'id_cuenta',label:'ID'},{key:'id_producto',label:'Producto'},{key:'tipo_cuenta',label:'Tipo'},{key:'numero_cuenta',label:'Número'},{key:'saldo',label:'Saldo',render:r=>fmt(r.saldo)},{key:'estado',label:'Estado'} ]}
        validateFn={f=>(!f.id_producto)?'ID Producto es requerido':null} toast={showToast} />;
      case 'prestamos':     return <CrudSection endpoint="prestamos"  idField="id_prestamo"  icon="CR" title="Prestamos"  formFields={PRESTAMO_FIELDS} formInit={toInit(PRESTAMO_FIELDS)}
        cols={[ {key:'id_prestamo',label:'ID'},{key:'id_producto',label:'Producto'},{key:'tipo_prestamo',label:'Tipo'},{key:'monto',label:'Monto',render:r=>fmt(r.monto)},{key:'plazo_meses',label:'Plazo'},{key:'tasa_interes',label:'Tasa %'},{key:'estado',label:'Estado'} ]}
        validateFn={f=>(!f.id_producto||!f.monto)?'ID Producto y Monto son requeridos':null} toast={showToast} />;
      case 'tarjetas':      return <CrudSection endpoint="tarjetas"   idField="id_tarjeta"   icon="TC" title="Tarjetas"   formFields={TARJETA_FIELDS}  formInit={toInit(TARJETA_FIELDS)}
        cols={[ {key:'id_tarjeta',label:'ID'},{key:'id_producto',label:'Producto'},{key:'tipo_tarjeta',label:'Tipo'},{key:'numero_tarjeta',label:'Número'},{key:'limite_credito',label:'Límite',render:r=>fmt(r.limite_credito)},{key:'saldo_actual',label:'Saldo',render:r=>fmt(r.saldo_actual)},{key:'estado',label:'Estado'} ]}
        validateFn={f=>(!f.id_producto)?'ID Producto es requerido':null} toast={showToast} />;
      default: return null;
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', fontFamily:"Inter, 'Segoe UI', system-ui, sans-serif", color:C.text }}>

      {/* Sidebar */}
      <nav style={{ width:248, background:C.sidebar, display:'flex', flexDirection:'column', flexShrink:0, position:'sticky', top:0, height:'100vh', overflowY:'auto', boxShadow:'8px 0 24px #0f172a12' }}>
        <div style={{ padding:'24px 20px 18px', borderBottom:`1px solid #ffffff14` }}>
          <div style={{ color:'#7db1ff', fontWeight:900, fontSize:20, letterSpacing:0 }}>SICVECA</div>
          <div style={{ color:'#7b8ca5', fontSize:12, marginTop:4, fontWeight:600 }}>DEV</div>
        </div>

        <div style={{ flex:1, padding:'12px 10px' }}>
          {NAV.map(n => {
            const active = section === n.id;
            return (
              <div key={n.id} onClick={() => setSection(n.id)}
                style={{ padding:'11px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:11, fontSize:14,
                  fontWeight: active ? 750 : 500,
                  color: active ? '#ffffff' : C.sidebarTxt,
                  background: active ? C.sidebarAct : 'transparent',
                  borderLeft: `3px solid ${active ? '#bfdbfe' : 'transparent'}`,
                  transition:'all 0.15s', borderRadius:8, marginBottom:4 }}
                onMouseOver={e => { if (!active) { e.currentTarget.style.background=C.sidebarHov; e.currentTarget.style.color='#fff'; }}}
                onMouseOut={e  => { if (!active) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color=C.sidebarTxt; }}}
              >
                <span style={{ width:30, height:24, borderRadius:7, display:'inline-flex', alignItems:'center', justifyContent:'center',
                  background: active ? '#ffffff22' : '#ffffff10', color: active ? '#fff' : '#9fb2ca', fontSize:10, fontWeight:900,
                  fontFamily:'ui-monospace, SFMono-Regular, Consolas, monospace', letterSpacing:0 }}>{n.icon}</span>
                <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.label}</span>
              </div>
            );
          })}
        </div>

        <div style={{ padding:'14px 20px', borderTop:`1px solid #ffffff14`, fontSize:12, color:'#65758d' }}>
          <div>SQL Server</div>
          <div style={{ color:'#334155', marginTop:2, wordBreak:'break-all' }}>database.windows.net</div>
        </div>
      </nav>

      {/* Content */}
      <main style={{ flex:1, padding:'32px 36px', overflowY:'auto', minWidth:0 }}>
        <div style={{ maxWidth:1240, margin:'0 auto' }}>
          {renderSection()}
        </div>
      </main>

      <Toast msg={toast.msg} type={toast.type} onClear={() => setToast({ msg:'', type:'' })} />
    </div>
  );
}
