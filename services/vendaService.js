"use strict";

/* ==================================================
   DEPENDÊNCIAS
================================================== */

const db = require("../database/connection");

const VendaModel = require("../models/vendaModel");
const ItemVendaModel = require("../models/itemVendaModel");

const MovimentacaoEstoqueService = require(
    "./movimentacaoEstoqueService"
);

const FinanceiroService = require("./financeiroService");

/* ==================================================
   FORMAS DE PAGAMENTO ACEITAS
================================================== */

const FORMAS_PAGAMENTO = [
    "PIX",
    "CARTAO_CREDITO",
    "CARTAO_DEBITO"
];

/* ==================================================
   SERVICE
================================================== */

const VendaService = {

    /* ==============================================
       FINALIZAR VENDA
    ============================================== */

    async finalizarVenda(empresaId, venda, itens) {

        if (!empresaId) {
            throw new Error("Empresa não informada.");
        }

        if (!venda || typeof venda !== "object") {
            throw new Error("Dados da venda não informados.");
        }

        if (!Array.isArray(itens) || itens.length === 0) {
            throw new Error(
                "A venda deve possuir pelo menos um item."
            );
        }

        const formaPagamento =
            venda.forma_pagamento ??
            venda.formaPagamento ??
            "PIX";

        if (!FORMAS_PAGAMENTO.includes(formaPagamento)) {
            throw new Error("Forma de pagamento inválida.");
        }

        const desconto = Number(venda.desconto ?? 0);
        const acrescimo = Number(venda.acrescimo ?? 0);

        if (
            !Number.isFinite(desconto) ||
            desconto < 0
        ) {
            throw new Error("Desconto inválido.");
        }

        if (
            !Number.isFinite(acrescimo) ||
            acrescimo < 0
        ) {
            throw new Error("Acréscimo inválido.");
        }

        const client = await db.connect();

        try {

            await client.query("BEGIN");

            const novaVenda = await VendaModel.criar(
                {
                    empresa_id: empresaId,

                    cliente_id:
                        venda.cliente_id ??
                        venda.clienteId ??
                        null,

                    usuario_id:
                        venda.usuario_id ??
                        venda.usuarioId ??
                        null,

                    data_venda:
                        venda.data_venda ??
                        venda.dataVenda ??
                        new Date(),

                    forma_pagamento: formaPagamento,

                    status:
                        venda.status ??
                        "AGUARDANDO_PAGAMENTO",

                    desconto,

                    acrescimo,

                    observacoes:
                        venda.observacoes ?? null,

                    valor_total: 0
                },
                client
            );

            let valorTotalBruto = 0;

            const itensCriados = [];

            for (const item of itens) {

                const produtoId =
                    item.produto_id ??
                    item.produtoId;

                const quantidade = Number(
                    item.quantidade
                );

                if (!produtoId) {
                    throw new Error(
                        "Produto não informado."
                    );
                }

                if (
                    !Number.isInteger(quantidade) ||
                    quantidade <= 0
                ) {
                    throw new Error(
                        "A quantidade do produto deve ser um número inteiro maior que zero."
                    );
                }

                /*
                ==========================================
                 BUSCA O PREÇO VERDADEIRO NO BANCO

                 O valor enviado pelo navegador é ignorado.
                ==========================================
                */

                const { rows } = await client.query(
                    `
                        SELECT
                            id,
                            nome,
                            preco
                        FROM produtos
                        WHERE id = $1
                          AND empresa_id = $2
                          AND ativo = TRUE
                        LIMIT 1
                        FOR UPDATE;
                    `,
                    [
                        produtoId,
                        empresaId
                    ]
                );

                const produto = rows[0];

                if (!produto) {
                    throw new Error(
                        "Produto não encontrado ou indisponível."
                    );
                }

                const precoUnitario = Number(
                    produto.preco
                );

                if (
                    !Number.isFinite(precoUnitario) ||
                    precoUnitario < 0
                ) {
                    throw new Error(
                        `O produto ${produto.nome} possui um preço inválido.`
                    );
                }

                const disponivel =
                    await MovimentacaoEstoqueService
                        .verificarDisponibilidade(
                            empresaId,
                            produtoId,
                            quantidade,
                            client
                        );

                if (!disponivel) {
                    throw new Error(
                        `Estoque insuficiente para o produto ${produto.nome}.`
                    );
                }

                const descontoItem = 0;

                const subtotal =
                    quantidade * precoUnitario -
                    descontoItem;

                const novoItem =
                    await ItemVendaModel.criar(
                        {
                            venda_id: novaVenda.id,
                            produto_id: produtoId,
                            quantidade,
                            preco_unitario:
                                precoUnitario,
                            desconto: descontoItem,
                            subtotal
                        },
                        client
                    );

                itensCriados.push(novoItem);

                await MovimentacaoEstoqueService.saida(
                    empresaId,
                    produtoId,
                    quantidade,
                    client
                );

                valorTotalBruto += subtotal;

            }

            const valorFinal =
                valorTotalBruto -
                desconto +
                acrescimo;

            if (valorFinal < 0) {
                throw new Error(
                    "O desconto não pode ser maior que o valor da venda somado ao acréscimo."
                );
            }

            /*
            ==========================================
             ATUALIZA OS TOTAIS

             O model recebe o total bruto.
             Ele calcula:
             valor_final = valor_total - desconto
                           + acréscimo
            ==========================================
            */

            const vendaAtualizada =
                await VendaModel.atualizarValorTotal(
                    novaVenda.id,
                    valorTotalBruto,
                    client
                );

            /* ==========================================
               GERA CONTA A RECEBER
            ========================================== */

            await FinanceiroService.gerarContaReceber(
                empresaId,
                {
                    id: vendaAtualizada.id,

                    valor_total:
                        vendaAtualizada.valor_final,

                    data_venda:
                        vendaAtualizada.data_venda,

                    observacoes:
                        vendaAtualizada.observacoes
                },
                client
            );

            await client.query("COMMIT");

            return {
                success: true,

                message:
                    "Venda finalizada com sucesso.",

                venda: vendaAtualizada,

                itens: itensCriados
            };

        } catch (error) {

            await client.query("ROLLBACK");

            throw error;

        } finally {

            client.release();

        }

    }

};

module.exports = VendaService;