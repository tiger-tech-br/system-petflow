"use strict";

const db = require("../database/connection");

async function findAll() {
    const result = await db.query(
        `
            SELECT
                id,
                nome,
                cpf,
                telefone,
                whatsapp,
                email,
                cidade,
                estado,
                ativo,
                created_at,
                updated_at
            FROM clientes
            ORDER BY nome ASC
        `
    );

    return result.rows;
}

async function findById(id) {
    const result = await db.query(
        `
            SELECT *
            FROM clientes
            WHERE id = $1
            LIMIT 1
        `,
        [id]
    );

    return result.rows[0] || null;
}

async function create(cliente) {
    const result = await db.query(
        `
            INSERT INTO clientes (
                nome,
                cpf,
                data_nascimento,
                telefone,
                whatsapp,
                email,
                cep,
                endereco,
                numero,
                complemento,
                bairro,
                cidade,
                estado,
                observacoes,
                ativo
            )
            VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,TRUE
            )
            RETURNING *
        `,
        [
            cliente.nome,
            cliente.cpf,
            cliente.dataNascimento || cliente.data_nascimento || null,
            cliente.telefone,
            cliente.whatsapp || null,
            cliente.email,
            cliente.cep || null,
            cliente.endereco || null,
            cliente.numero || null,
            cliente.complemento || null,
            cliente.bairro || null,
            cliente.cidade || null,
            cliente.estado || null,
            cliente.observacoes || null
        ]
    );

    return result.rows[0];
}

async function update(id, cliente) {
    const result = await db.query(
        `
            UPDATE clientes
            SET
                nome = $1,
                cpf = $2,
                data_nascimento = $3,
                telefone = $4,
                whatsapp = $5,
                email = $6,
                cep = $7,
                endereco = $8,
                numero = $9,
                complemento = $10,
                bairro = $11,
                cidade = $12,
                estado = $13,
                observacoes = $14,
                updated_at = NOW()
            WHERE id = $15
            RETURNING *
        `,
        [
            cliente.nome,
            cliente.cpf,
            cliente.dataNascimento || cliente.data_nascimento || null,
            cliente.telefone,
            cliente.whatsapp || null,
            cliente.email,
            cliente.cep || null,
            cliente.endereco || null,
            cliente.numero || null,
            cliente.complemento || null,
            cliente.bairro || null,
            cliente.cidade || null,
            cliente.estado || null,
            cliente.observacoes || null,
            id
        ]
    );

    return result.rows[0] || null;
}

async function remove(id) {
    await db.query(
        `
            UPDATE clientes
            SET ativo = FALSE,
                updated_at = NOW()
            WHERE id = $1
        `,
        [id]
    );
}

module.exports = {
    findAll,
    findById,
    create,
    update,
    remove
};
