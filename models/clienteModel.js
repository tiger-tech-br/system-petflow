"use strict";

const db = require("../database/connection");

async function findAll(empresaId) {
    const result = await db.query(
        `
            SELECT
                c.id,
                c.nome,
                c.cpf,
                c.data_nascimento,
                c.telefone,
                c.whatsapp,
                COALESCE(c.email, uc.email) AS email,
                c.cep,
                c.endereco,
                c.numero,
                c.complemento,
                c.bairro,
                c.cidade,
                c.estado,
                c.ativo,
                CASE
                    WHEN c.ativo = TRUE THEN 'ativo'
                    ELSE 'inativo'
                END AS status,
                COUNT(p.id)::INTEGER AS total_pets,
                COALESCE(
                    STRING_AGG(
                        DISTINCT p.nome,
                        ', '
                    ) FILTER (WHERE p.id IS NOT NULL),
                    'Nenhum pet cadastrado'
                ) AS pets,
                CONCAT_WS(
                    ', ',
                    NULLIF(c.endereco, ''),
                    NULLIF(c.numero, ''),
                    NULLIF(c.complemento, ''),
                    NULLIF(c.bairro, ''),
                    NULLIF(c.cidade, ''),
                    NULLIF(c.estado, '')
                ) AS endereco_completo,
                c.created_at,
                c.updated_at
            FROM clientes
            LEFT JOIN usuarios_clientes uc
                ON uc.cliente_id = c.id
            LEFT JOIN pets p
                ON p.cliente_id = c.id
               AND p.ativo = TRUE
               AND (
                   p.empresa_id = c.empresa_id
                   OR p.empresa_id IS NULL
                   OR p.empresa_id = get_petflow_empresa_id()
               )
            WHERE c.empresa_id = get_petflow_empresa_id()
               OR c.empresa_id IS NULL
               OR uc.cliente_id IS NOT NULL
               OR (
                   $1::uuid IS NOT NULL
                   AND c.empresa_id = $1
               )
            GROUP BY c.id, uc.email
            ORDER BY c.nome ASC
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
                  OR empresa_id IS NULL
                  OR EXISTS (
                      SELECT 1
                      FROM usuarios_clientes uc
                      WHERE uc.cliente_id = clientes.id
                  )
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
                  OR empresa_id IS NULL
                  OR EXISTS (
                      SELECT 1
                      FROM usuarios_clientes uc
                      WHERE uc.cliente_id = clientes.id
                  )
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
                  OR empresa_id IS NULL
                  OR EXISTS (
                      SELECT 1
                      FROM usuarios_clientes uc
                      WHERE uc.cliente_id = clientes.id
                  )
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
