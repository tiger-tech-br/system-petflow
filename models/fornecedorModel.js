"use strict";

const db = require("../database/connection");

async function listar(empresaId) {
    const query = `
        SELECT *
        FROM fornecedores
        WHERE empresa_id = $1
        ORDER BY nome ASC
    `;

    const { rows } = await db.query(query, [empresaId]);

    return rows;
}

async function buscarPorId(id, empresaId) {
    const query = `
        SELECT *
        FROM fornecedores
        WHERE id = $1
        AND empresa_id = $2
        LIMIT 1
    `;

    const { rows } = await db.query(query, [id, empresaId]);

    return rows[0];
}

async function criar(dados) {
    const query = `
        INSERT INTO fornecedores (
            empresa_id,
            nome,
            cnpj,
            telefone,
            email,
            endereco
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
    `;

    const valores = [
        dados.empresa_id,
        dados.nome,
        dados.cnpj,
        dados.telefone,
        dados.email,
        dados.endereco
    ];

    const { rows } = await db.query(query, valores);

    return rows[0];
}

async function atualizar(id, empresaId, dados) {
    const query = `
        UPDATE fornecedores
        SET
            nome = $1,
            cnpj = $2,
            telefone = $3,
            email = $4,
            endereco = $5,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        AND empresa_id = $7
        RETURNING *
    `;

    const valores = [
        dados.nome,
        dados.cnpj,
        dados.telefone,
        dados.email,
        dados.endereco,
        id,
        empresaId
    ];

    const { rows } = await db.query(query, valores);

    return rows[0];
}

async function excluir(id, empresaId) {
    const query = `
        DELETE FROM fornecedores
        WHERE id = $1
        AND empresa_id = $2
        RETURNING *
    `;

    const { rows } = await db.query(query, [id, empresaId]);

    return rows[0];
}

module.exports = {
    listar,
    buscarPorId,
    criar,
    atualizar,
    excluir
};
