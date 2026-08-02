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
       LISTAR PEDIDOS
    ========================== */

    static async listar(empresaId) {

        const query = `
            SELECT
                v.id,
                v.cliente_id,
                c.nome AS cliente_nome,
                c.telefone AS cliente_telefone,
                c.whatsapp AS cliente_whatsapp,
                v.valor_total,
                v.desconto,
                v.acrescimo,
                v.valor_final,
                v.forma_pagamento,
                v.status,
                v.data_venda,
                COUNT(iv.id)::INTEGER AS quantidade_itens
            FROM vendas v
            LEFT JOIN clientes c
                ON c.id = v.cliente_id
               AND c.empresa_id = v.empresa_id
            LEFT JOIN itens_venda iv
                ON iv.venda_id = v.id
               AND iv.empresa_id = v.empresa_id
            WHERE v.empresa_id = $1
            GROUP BY
                v.id,
                c.id,
                c.nome,
                c.telefone,
                c.whatsapp
            ORDER BY v.data_venda DESC;
        `;

        const { rows } = await db.query(query, [empresaId]);

        return rows;

    }

    /* ==========================
       BUSCAR PEDIDO POR ID
    ========================== */

    static async buscarPorId(id, empresaId) {

        const query = `
            SELECT
                v.id,
                v.cliente_id,
                v.usuario_id,
                v.data_venda,
                v.valor_total,
                v.desconto,
                v.acrescimo,
                v.valor_final,
                v.forma_pagamento,
                v.status,
                v.observacoes,
                v.created_at,
                v.updated_at,
                CASE
                    WHEN c.id IS NULL THEN NULL
                    ELSE jsonb_build_object(
                        'id', c.id,
                        'nome', c.nome,
                        'email', c.email,
                        'telefone', c.telefone,
                        'whatsapp', c.whatsapp,
                        'cep', c.cep,
                        'endereco', c.endereco,
                        'numero', c.numero,
                        'complemento', c.complemento,
                        'bairro', c.bairro,
                        'cidade', c.cidade,
                        'estado', c.estado
                    )
                END AS cliente,
                COALESCE(itens.itens, '[]'::jsonb) AS itens
            FROM vendas v
            LEFT JOIN clientes c
                ON c.id = v.cliente_id
               AND c.empresa_id = v.empresa_id
            LEFT JOIN LATERAL (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', iv.id,
                        'produto_id', iv.produto_id,
                        'produto', p.nome,
                        'quantidade', iv.quantidade,
                        'preco_unitario', iv.preco_unitario,
                        'desconto', iv.desconto,
                        'subtotal', iv.subtotal
                    )
                    ORDER BY iv.created_at ASC, iv.id ASC
                ) AS itens
                FROM itens_venda iv
                INNER JOIN produtos p
                    ON p.id = iv.produto_id
                   AND p.empresa_id = v.empresa_id
                WHERE iv.venda_id = v.id
                  AND iv.empresa_id = v.empresa_id
            ) itens ON TRUE
            WHERE v.id = $1
              AND v.empresa_id = $2
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
                usuario_id,
                data_venda,
                valor_total,
                desconto,
                acrescimo,
                valor_final,
                forma_pagamento,
                status,
                observacoes
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                $10,
                $11
            )
            RETURNING *;
        `;

        const valorTotal = Number(
            dados.valorTotal ?? dados.valor_total ?? 0
        );

        const desconto = Number(dados.desconto ?? 0);
        const acrescimo = Number(dados.acrescimo ?? 0);
        const valorFinal = valorTotal - desconto + acrescimo;

        const values = [
            dados.empresaId ?? dados.empresa_id,
            dados.clienteId ?? dados.cliente_id ?? null,
            dados.usuarioId ?? dados.usuario_id ?? null,
            dados.dataVenda ?? dados.data_venda ?? new Date(),
            valorTotal,
            desconto,
            acrescimo,
            valorFinal,
            dados.formaPagamento ??
                dados.forma_pagamento ??
                "PIX",
            dados.status ?? "PENDENTE",
            dados.observacoes?.trim() || null
        ];

        const { rows } = await client.query(query, values);

        return rows[0];

    }

    /* ==========================
       ATUALIZAR STATUS
    ========================== */

    static async atualizarStatus(
        id,
        empresaId,
        status,
        client = db
    ) {

        const query = `
            UPDATE vendas
            SET
                status = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
              AND empresa_id = $3
            RETURNING *;
        `;

        const values = [
            status,
            id,
            empresaId
        ];

        const { rows } = await client.query(query, values);

        return rows[0];

    }

    /* ==========================
       ATUALIZAR VALOR TOTAL
    ========================== */

    static async atualizarValorTotal(
        id,
        valorTotal,
        client = db
    ) {

        const query = `
            UPDATE vendas
            SET
                valor_total = $1,
                valor_final = $1 - desconto + acrescimo,
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
       TOTAL DE VENDAS
    ========================== */

    static async totalVendas(empresaId) {

        const query = `
            SELECT
                COUNT(*) AS quantidade,
                COALESCE(SUM(valor_final), 0) AS total
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