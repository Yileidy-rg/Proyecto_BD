import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './styles.css';

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

        console.log('Resultados búsqueda:', response.data);
        setResultadosBusqueda(response.data);
      } catch (error) {
        console.error('Error en búsqueda inteligente:', error);
      }
    };

    buscarClientes();
  }, [busqueda]);

  const generarXML = async () => {
    try {
      const response = await axios.get(`${API_URL}/xml/generar`);
      alert('XML generado correctamente. Revisá la consola.');
      console.log(response.data);
    } catch (error) {
      console.error('Error al generar XML:', error);
      alert('Error al generar XML');
    }
  };

  return (
    <div className="app">
      <h1>SICVECA - DEV React + Node.js</h1>

      <section className="card">
        <h2>CRUD</h2>

        <div className="crud-controls">
          <select value={tabla} onChange={(e) => setTabla(e.target.value)}>
            <option value="clientes">clientes</option>
            <option value="productos">productos</option>
            <option value="cuentas">cuentas</option>
            <option value="prestamos">prestamos</option>
            <option value="tarjetas">tarjetas</option>
            <option value="transacciones">transacciones</option>
          </select>

          <button onClick={cargarDatos}>Refrescar</button>
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
            <p>No hay datos para mostrar.</p>
          )}
        </div>
      </section>

      <section className="card">
        <h2>Búsqueda inteligente de clientes</h2>

        <input
          type="text"
          placeholder="Buscar por cédula, nombre o apellido"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <div className="resultados-busqueda">
          {busqueda.length >= 2 && resultadosBusqueda.length === 0 && (
            <p>No hay resultados.</p>
          )}

          {resultadosBusqueda.map((cliente) => (
            <div key={cliente.ClienteID} className="resultado-item">
              <strong>{cliente.Identificacion}</strong> -{' '}
              {cliente.NombreCompleto}

              <br />

              <span>
                {cliente.TipoCliente} | {cliente.Provincia}, {cliente.Canton},{' '}
                {cliente.Distrito}
              </span>

              <br />

              <small>Relevancia: {cliente.Relevancia}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <button className="btn-principal" onClick={generarXML}>
          Generar XML
        </button>
      </section>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);