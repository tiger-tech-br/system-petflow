"use strict";

/* ==================================================
   DATABASE
================================================== */

const db = require("../database/connection");

/* ==================================================
   LISTAR
================================================== */

async function findAll(empresaId) {

    const result = await db.query(

        `
            SELECT

                p.id,

                p.nome,

                p.descricao,

                p.preco,

                p.custo,

                p.codigo_barras,

                p.sku,

                p.foto,

                p.status,

                c.nome AS categoria

            FROM produtos p

            INNER JOIN categorias c

                ON c.id = p.categoria_id

            WHERE p.empresa_id = $1

            ORDER BY p.nome ASC
        `,

        [empresaId]

    );

    return result.rows;

}

/* ==================================================
   BUSCAR POR ID
================================================== */

async function findById(id, empresaId) {

    const result = await db.query(

        `
            SELECT *

            FROM produtos

            WHERE

                id = $1

            AND

                empresa_id = $2

            LIMIT 1
        `,

        [

            id,

            empresaId

        ]

    );

    return result.rows[0] || null;

}

/* ==================================================
   CADASTRAR
================================================== */

async function create(produto) {

    const result = await db.query(

        `
            INSERT INTO produtos (

                empresa_id,

                categoria_id,

                nome,

                descricao,

                sku,

                codigo_barras,

                preco,

                custo,

                foto,

                status

            )

            VALUES (

                $1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE

            )

            RETURNING *
        `,

        [

            produto.empresaId,

            produto.categoriaId,

            produto.nome,

            produto.descricao,

            produto.sku,

            produto.codigoBarras,

            produto.preco,

            produto.custo,

            produto.foto

        ]

    );

    return result.rows[0];

}

/* ==================================================
   ATUALIZAR
================================================== */

async function update(id, produto, empresaId) {

    const result = await db.query(

        `
            UPDATE produtos

            SET

                categoria_id = $1,

                nome = $2,

                descricao = $3,

                sku = $4,

                codigo_barras = $5,

                preco = $6,

                custo = $7,

                foto = $8,

                updated_at = NOW()

            WHERE

                id = $9

            AND

                empresa_id = $10

            RETURNING *
        `,

        [

            produto.categoriaId,

            produto.nome,

            produto.descricao,

            produto.sku,

            produto.codigoBarras,

            produto.preco,

            produto.custo,

            produto.foto,

            id,

            empresaId

        ]

    );

    return result.rows[0];

}

/* ==================================================
   REMOVER
================================================== */

async function remove(id, empresaId) {

    await db.query(

        `
            DELETE FROM produtos

            WHERE

                id = $1

            AND

                empresa_id = $2
        `,

        [

            id,

            empresaId

        ]

    );

}

/* ==================================================
   EXPORTAÇÃO
================================================== */

module.exports = {

    findAll,

    findById,

    create,

    update,

    remove

};