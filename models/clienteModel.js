"use strict";

const db = require("../database/connection");

async function findAll(empresaId) {
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
                CASE
                    WHEN ativo = TRUE THEN 'ativo'
                    ELSE 'inativo'
                END AS status,
                created_at,
                updated_at
            FROM clientes
            WHERE empresa_id = get_petflow_empresa_id()
               OR (
                   $1::uuid IS NOT NULL
                   AND empresa_id = $1
               )
            ORDER BY nome ASC
        `,
        [empresaId || null]
    );

    return result.rows;
}

async function findById(id, empresaId) {
    const result = await db.query(
        `
            SELECT *
            FROM clientes
            WHERE id = $1
              AND (
                  empresa_id = get_petflow_empresa_id()
                  OR (
                      $2::uuid IS NOT NULL
                      AND empresa_id = $2
                  )
              )
            LIMIT 1
        `,
        [id, empresaId || null]
    );

    return result.rows[0] || null;
}

async function create(cliente) {
    const result = await db.query(
        `
            INSERT INTO clientes (
                empresa_id,
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
                get_petflow_empresa_id(),
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

async function update(id, cliente, empresaId) {
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
              AND (
                  empresa_id = get_petflow_empresa_id()
                  OR (
                      $16::uuid IS NOT NULL
                      AND empresa_id = $16
                  )
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
            cliente.observacoes || null,
            id,
            empresaId || null
        ]
    );

    return result.rows[0] || null;
}

async function remove(id, empresaId) {
    await db.query(
        `
            UPDATE clientes
            SET ativo = FALSE,
                updated_at = NOW()
            WHERE id = $1
              AND (
                  empresa_id = get_petflow_empresa_id()
                  OR (
                      $2::uuid IS NOT NULL
                      AND empresa_id = $2
                  )
              )
        `,
        [id, empresaId || null]
    );
}

module.exports = {
    findAll,
    findById,
    create,
    update,
    remove
};
