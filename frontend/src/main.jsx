import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './style.css';

function Button3D({ children, onClick }) {
  return (
    <button className="button" onClick={onClick}>
      <span className="shadow"></span>
      <span className="edge"></span>
      <span className="front">
        <span>{children}</span>
      </span>
    </button>
  );
}

function App() {
  const [tabla, setTabla] = useState('clientes');
  const [datos, setDatos] = useState([]);

  const [busqueda, setBusqueda] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);

  const API_URL = 'http://localhost:3001/api';

  const cargarDatos = async () => {
    try {
      const response = await axios.get(`${API_URL}/crud/${tabla}`);
      setDatos(response.data);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setDatos([]);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [tabla]);

  useEffect(() => {
    const buscarClientes = async () => {
      if (busqueda.trim().length < 2) {
        setResultadosBusqueda([]);
        return;
      }

      try {
        const response = await axios.get(
          `${API_URL}/busqueda/clientes?texto=${busqueda}`
        );

        setResultadosBusqueda(response.data);
      } catch (error) {
        console.error('Error en búsqueda inteligente:', error);
        setResultadosBusqueda([]);
      }
    };

    buscarClientes();
  }, [busqueda]);

  const generarXML = async () => {
    try {
      const response = await axios.get(`${API_URL}/xml/generar`);
      console.log(response.data);
      alert('XML generado correctamente. Revisá la consola.');
    } catch (error) {
      console.error('Error al generar XML:', error);
      alert('Error al generar XML.');
    }
  };

  return (
    <div className="app">
      <header className="top-bar">
        <h1>SIDVECA</h1>
      </header>

      <main className="layout">
        <section className="panel panel-crud">
          <div className="panel-header">
            <h2>CRUD</h2>
            <p>Gestión de tablas transaccionales del sistema.</p>
          </div>

          <div className="crud-controls">
            <div className="coolinput">
              <label className="text">Tabla</label>
              <select
                className="input-select"
                value={tabla}
                onChange={(e) => setTabla(e.target.value)}
              >
                <option value="clientes">clientes</option>
                <option value="productos">productos</option>
                <option value="cuentas">cuentas</option>
                <option value="prestamos">prestamos</option>
                <option value="tarjetas">tarjetas</option>
                <option value="transacciones">transacciones</option>
              </select>
            </div>

            <Button3D onClick={cargarDatos}>Refrescar</Button3D>
          </div>

          <div className="tabla-contenedor">
            {datos.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    {Object.keys(datos[0]).map((columna) => (
                      <th key={columna}>{columna}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {datos.map((fila, index) => (
                    <tr key={index}>
                      {Object.values(fila).map((valor, i) => (
                        <td key={i}>{String(valor)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                No hay datos para mostrar.
              </div>
            )}
          </div>

          <div className="crud-actions">
            <Button3D onClick={() => alert('Función pendiente de conectar')}>
              Nuevo
            </Button3D>

            <Button3D onClick={() => alert('Función pendiente de conectar')}>
              Editar
            </Button3D>

            <Button3D onClick={() => alert('Función pendiente de conectar')}>
              Eliminar
            </Button3D>
          </div>
        </section>

        <aside className="panel panel-search">
          <div className="panel-header">
            <h2>Búsqueda inteligente</h2>
            <p>Consulta rápida de clientes.</p>
          </div>

          <div className="coolinput">
            <label className="text">Buscar cliente</label>
            <input
              type="text"
              className="input"
              placeholder="Nombre, cédula o apellido"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <div className="resultados-busqueda">
            {busqueda.length >= 2 && resultadosBusqueda.length === 0 && (
              <p className="sin-resultados">No hay resultados.</p>
            )}

            {resultadosBusqueda.length > 0 && (
              <table className="tabla-busqueda">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Identificación</th>
                    <th>Nombre</th>
                    <th>Relevancia</th>
                  </tr>
                </thead>

                <tbody>
                  {resultadosBusqueda.map((cliente) => (
                    <tr key={cliente.ClienteID}>
                      <td>{cliente.ClienteID}</td>
                      <td>{cliente.Identificacion}</td>
                      <td>{cliente.NombreCompleto}</td>
                      <td>{cliente.Relevancia}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {resultadosBusqueda.map((cliente) => (
            <div key={`detalle-${cliente.ClienteID}`} className="cliente-card">
              <strong>{cliente.NombreCompleto}</strong>
              <span>{cliente.TipoCliente}</span>
              <small>
                {cliente.Provincia}, {cliente.Canton}, {cliente.Distrito}
              </small>
            </div>
          ))}

          <div className="xml-area">
            <Button3D onClick={generarXML}>Generar XML</Button3D>
          </div>
        </aside>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);