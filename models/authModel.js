"use strict";

/* ==================================================
   DATABASE
================================================== */

const db = require("../database/connection");

/* ==================================================
   BUSCAR POR E-MAIL
================================================== */

async function findByEmail(email) {

    const result = await db.query(

        `
            SELECT

                id,

                NULL AS empresa_id,

                nome,

                email,

                senha_hash AS senha,

                perfil AS cargo,

                ativo AS status

            FROM usuarios

            WHERE email = $1

            LIMIT 1
        `,

        [email]

    );

    return result.rows[0] || null;

}

/* ==================================================
   BUSCAR POR ID
================================================== */

async function findById(id) {

    const result = await db.query(

        `
            SELECT

                id,

                NULL AS empresa_id,

                nome,

                email,

                perfil AS cargo,

                ativo AS status,

                created_at,

                updated_at

            FROM usuarios

            WHERE id = $1

            LIMIT 1
        `,

        [id]

    );

    return result.rows[0] || null;

}

/* ==================================================
   ATUALIZAR ÚLTIMO LOGIN
================================================== */

async function updateLastLogin(id) {

    await db.query(

        `
            UPDATE usuarios

            SET ultimo_login = NOW()

            WHERE id = $1
        `,

        [id]

    );

}

/* ==================================================
   EXPORTAÇÃO
================================================== */

module.exports = {

    findByEmail,

    findById,

    updateLastLogin

};
