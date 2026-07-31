"use strict";

/* ==================================================
   DEPENDÊNCIAS
================================================== */

const db = require("../database/connection");

/* ==================================================
   MODEL
================================================== */

class VendaModel {

    /* ==========================
       LISTAR VENDAS
    ========================== */

    static async listar(empresaId) {

        const query = `
            SELECT
                v.id,
                v.cliente_id,
                c.nome AS cliente,
                v.valor_total,
                v.forma_pagamento,
                v.status,
                v.created_at
            FROM vendas v
            LEFT JOIN clientes c
                ON c.id = v.cliente_id
            WHERE v.empresa_id = $1
            ORDER BY v.created_at DESC;
        `;

        const { rows } = await db.query(query, [empresaId]);

        return rows;

    }

    /* ==========================
       BUSCAR POR ID
    ========================== */

    static async buscarPorId(id, empresaId) {

        const query = `
            SELECT *
            FROM vendas
            WHERE id = $1
              AND empresa_id = $2
            LIMIT 1;
        `;

        const { rows } = await db.query(query, [

            id,
            empresaId

        ]);

        return rows[0];

    }

    /* ==========================
       CADASTRAR
    ========================== */

    static async criar(dados, client = db) {

        const query = `
            INSERT INTO vendas (

                empresa_id,
                cliente_id,
                valor_total,
                desconto,
                acrescimo,
                forma_pagamento,
                status

            )

            VALUES (

                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7

            )

            RETURNING *;
        `;

        const values = [

            dados.empresaId,
            dados.clienteId,
            dados.valorTotal,
            dados.desconto,
            dados.acrescimo,
            dados.formaPagamento,
            dados.status

        ];

        const { rows } = await client.query(query, values);

        return rows[0];

    }

    /* ==========================
       ATUALIZAR
    ========================== */

    static async atualizar(id, empresaId, dados, client = db) {

        const query = `
            UPDATE vendas
            SET

                cliente_id = $1,
                valor_total = $2,
                desconto = $3,
                acrescimo = $4,
                forma_pagamento = $5,
                status = $6,
                updated_at = CURRENT_TIMESTAMP

            WHERE id = $7
              AND empresa_id = $8

            RETURNING *;
        `;

        const values = [

            dados.clienteId,
            dados.valorTotal,
            dados.desconto,
            dados.acrescimo,
            dados.formaPagamento,
            dados.status,
            id,
            empresaId

        ];

        const { rows } = await client.query(query, values);

        return rows[0];

    }

    /* ==========================
       ATUALIZAR VALOR TOTAL
    ========================== */

    static async atualizarValorTotal(id, valorTotal, client = db) {

        const query = `
            UPDATE vendas
            SET

                valor_total = $1,
                updated_at = CURRENT_TIMESTAMP

            WHERE id = $2

            RETURNING *;
        `;

        const { rows } = await client.query(query, [

            valorTotal,
            id

        ]);

        return rows[0];

    }

    /* ==========================
       EXCLUIR
    ========================== */

    static async excluir(id, empresaId, client = db) {

        const query = `
            DELETE FROM vendas
            WHERE id = $1
              AND empresa_id = $2

            RETURNING *;
        `;

        const { rows } = await client.query(query, [

            id,
            empresaId

        ]);

        return rows[0];

    }

    /* ==========================
       TOTAL DE VENDAS
    ========================== */

    static async totalVendas(empresaId) {

        const query = `
            SELECT

                COUNT(*) AS quantidade,

                COALESCE(SUM(valor_total), 0) AS total

            FROM vendas

            WHERE empresa_id = $1;
        `;

        const { rows } = await db.query(query, [

            empresaId

        ]);

        return rows[0];

    }

}

module.exports = VendaModel;
