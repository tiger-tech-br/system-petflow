"use strict";

/* ==================================================
   DOTENV
================================================== */

require("dotenv").config();

/* ==================================================
   POSTGRESQL
================================================== */

const { Pool } = require("pg");

/* ==================================================
   POOL
================================================== */

const pool = new Pool({

    host: process.env.DB_HOST,

    port: process.env.DB_PORT,

    database: process.env.DB_NAME,

    user: process.env.DB_USER,

    password: process.env.DB_PASSWORD,

    max: 20,

    idleTimeoutMillis: 30000,

    connectionTimeoutMillis: 5000

});

/* ==================================================
   TESTE DE CONEXÃO
================================================== */

async function connectDatabase() {

    try {

        await pool.query("SELECT NOW()");

        console.log("✅ PostgreSQL conectado.");

    } catch (error) {

        console.error("❌ Erro ao conectar no PostgreSQL.");

        console.error(error);

        process.exit(1);

    }

}

/* ==================================================
   EXPORTAÇÃO
================================================== */

module.exports = {

    pool,

    connectDatabase

};