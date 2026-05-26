require("dotenv").config();
const sql = require("mssql");

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: Number(process.env.DB_PORT || 1433),
  options: {
    encrypt: true,
    trustServerCertificate: false
  },
  connectionTimeout: 30000,
  requestTimeout: 30000
};

async function main() {
  try {
    console.log("Probando conexión:", {
      server: config.server,
      database: config.database,
      user: config.user,
      port: config.port,
      passwordLoaded: Boolean(config.password)
    });

    const pool = await sql.connect(config);
    const result = await pool.request().query("SELECT 1 AS ok");
    console.log("✅ Conexión exitosa:", result.recordset);
    await pool.close();
  } catch (error) {
    console.error("❌ Error completo:");
    console.error(error);
  }
}

main();