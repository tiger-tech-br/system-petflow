"use strict";

const db = require("../database/connection");

const VendaModel = require("../models/vendaModel");
const ItemVendaModel = require("../models/itemVendaModel");

const MovimentacaoEstoqueService = require("./movimentacaoEstoqueService");
const FinanceiroService = require("./financeiroService");

const VendaService = {

    /* ==============================================
       FINALIZAR VENDA
    ============================================== */

    async finalizarVenda(empresaId, venda, itens) {

        if (!Array.isArray(itens) || itens.length === 0) {

            throw new Error("A venda deve possuir pelo menos um item.");

        }

        const client = await db.connect();

        try {

            await client.query("BEGIN");

            const novaVenda = await VendaModel.criar({

                empresa_id: empresaId,

                cliente_id: venda.cliente_id,

                usuario_id: venda.usuario_id,

                data_venda: venda.data_venda,

                forma_pagamento: venda.forma_pagamento,

                status: venda.status || "PENDENTE",

                desconto: venda.desconto || 0,

                acrescimo: venda.acrescimo || 0,

                observacoes: venda.observacoes,

                valor_total: 0

            }, client);

            let valorTotal = 0;

            const itensCriados = [];

            for (const item of itens) {

                const quantidade = Number(item.quantidade);

                const valorUnitario = Number(item.valor_unitario);

                if (quantidade <= 0) {

                    throw new Error("Quantidade inválida.");

                }

                if (valorUnitario < 0) {

                    throw new Error("Valor unitário inválido.");

                }

                const subtotal = quantidade * valorUnitario;

                const disponivel =
                    await MovimentacaoEstoqueService.verificarDisponibilidade(

                        empresaId,

                        item.produto_id,

                        quantidade,

                        client

                    );

                if (!disponivel) {

                    throw new Error(

                        `Estoque insuficiente para o produto ${item.produto_id}.`

                    );

                }

                const novoItem = await ItemVendaModel.criar({

                    venda_id: novaVenda.id,

                    empresa_id: empresaId,

                    produto_id: item.produto_id,

                    quantidade,

                    valor_unitario: valorUnitario,

                    subtotal

                }, client);

                itensCriados.push(novoItem);

                await MovimentacaoEstoqueService.saida(

                    empresaId,

                    item.produto_id,

                    quantidade,

                    client

                );

                valorTotal += subtotal;

            }

            valorTotal =

                valorTotal -

                Number(venda.desconto || 0) +

                Number(venda.acrescimo || 0);

            const vendaAtualizada = await VendaModel.atualizarValorTotal(

                novaVenda.id,

                valorTotal,

                client

            );

            /* ==========================================
               GERA CONTA A RECEBER
            ========================================== */

            await FinanceiroService.gerarContaReceber(

                empresaId,

                {

                    id: vendaAtualizada.id,

                    valor_total: valorTotal,

                    data_venda: venda.data_venda,

                    observacoes: venda.observacoes

                },

                client

            );

            await client.query("COMMIT");

            return {

                success: true,

                message: "Venda finalizada com sucesso.",

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
