"use strict";

const db = require("../database/connection");

class ItemVendaModel {

    /* ==========================
       LISTAR ITENS DA VENDA
    ========================== */

    static async listar(vendaId, empresaId) {

        const query = `
            SELECT

                iv.*,

                p.nome AS produto

            FROM itens_venda iv

            INNER JOIN produtos p
                ON p.id = iv.produto_id

            WHERE iv.venda_id = $1
              AND iv.empresa_id = $2

            ORDER BY iv.id ASC;
        `;

        const { rows } = await db.query(query, [

            vendaId,
            empresaId

        ]);

        return rows;

    }

    /* ==========================
       BUSCAR POR ID
    ========================== */

    static async buscarPorId(id, empresaId) {

        const query = `
            SELECT *

            FROM itens_venda

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
            INSERT INTO itens_venda (

                venda_id,
                empresa_id,
                produto_id,
                quantidade,
                valor_unitario,
                subtotal

            )

            VALUES (

                $1,
                $2,
                $3,
                $4,
                $5,
                $6

            )

            RETURNING *;
        `;

        const values = [

            dados.vendaId || dados.venda_id,
            dados.empresaId || dados.empresa_id,
            dados.produtoId || dados.produto_id,
            dados.quantidade,
            dados.valorUnitario || dados.valor_unitario,
            dados.subtotal

        ];

        const { rows } = await client.query(query, values);

        return rows[0];

    }

    /* ==========================
       ATUALIZAR
    ========================== */

    static async atualizar(id, empresaId, dados, client = db) {

        const query = `
            UPDATE itens_venda
            SET

                produto_id = $1,
                quantidade = $2,
                valor_unitario = $3,
                subtotal = $4,
                updated_at = CURRENT_TIMESTAMP

            WHERE id = $5
              AND empresa_id = $6

            RETURNING *;
        `;

        const values = [

            dados.produtoId || dados.produto_id,
            dados.quantidade,
            dados.valorUnitario || dados.valor_unitario,
            dados.subtotal,
            id,
            empresaId

        ];

        const { rows } = await client.query(query, values);

        return rows[0];

    }

    /* ==========================
       EXCLUIR
    ========================== */

    static async excluir(id, empresaId, client = db) {

        const query = `
            DELETE FROM itens_venda

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

}

module.exports = ItemVendaModel;
