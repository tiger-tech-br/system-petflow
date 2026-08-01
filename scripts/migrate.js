"use strict";

const fs = require("fs/promises");
const path = require("path");
const { Pool } = require("pg");

require("dotenv").config();

const SQL_DIR = path.join(__dirname, "..", "database", "sql");

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

async function run() {
    const files = (await fs.readdir(SQL_DIR))
        .filter((file) => file.endsWith(".sql"))
        .sort((a, b) => a.localeCompare(b));

    const client = await pool.connect();

    try {
        for (const file of files) {
            const filePath = path.join(SQL_DIR, file);
            const sql = await fs.readFile(filePath, "utf8");

            console.log(`Aplicando ${file}...`);
            await client.query(sql);
        }

        console.log("Banco de dados atualizado com sucesso.");
    } finally {
        client.release();
        await pool.end();
    }
}

run().catch((error) => {
    console.error("Erro ao atualizar o banco de dados.");
    console.error(error);
    process.exit(1);
});
