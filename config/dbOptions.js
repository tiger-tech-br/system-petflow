"use strict";

function buildDbOptions() {
    if (process.env.DATABASE_URL) {
        return {
            connectionString: process.env.DATABASE_URL,
            ...(process.env.DB_SSL === "true"
                ? { ssl: { rejectUnauthorized: false } }
                : {})
        };
    }

    return {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD
    };
}

module.exports = {
    buildDbOptions
};
