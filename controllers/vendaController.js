"use strict";

/* ==================================================
   DEPENDÊNCIAS
================================================== */

const VendaModel = require("../models/vendaModel");
const VendaService = require("../services/vendaService");

/* ==================================================
   CONTROLLER
================================================== */

class VendaController {

    /* ==========================
       LISTAR VENDAS
    ========================== */

    static async listar(req, res, next) {

        try {

            const empresaId = req.usuario.empresaId;

            const vendas = await VendaModel.listar(empresaId);

            return res.status(200).json(vendas);

        } catch (error) {

            next(error);

        }

    }

    /* ==========================
       BUSCAR VENDA POR ID
    ========================== */

    static async buscarPorId(req, res, next) {

        try {

            const { id } = req.params;

            const empresaId = req.usuario.empresaId;

            const venda = await VendaModel.buscarPorId(

                id,

                empresaId

            );

            if (!venda) {

                return res.status(404).json({

                    erro: "Venda não encontrada."

                });

            }

            return res.status(200).json(venda);

        } catch (error) {

            next(error);

        }

    }

    /* ==========================
       FINALIZAR VENDA
    ========================== */

    static async criar(req, res, next) {

        try {

            const empresaId = req.usuario.empresaId;

            const {

                clienteId,
                usuarioId,
                formaPagamento,
                status,
                desconto = 0,
                acrescimo = 0,
                observacoes,
                itens

            } = req.body;

            if (!Array.isArray(itens) || itens.length === 0) {

                return res.status(400).json({

                    erro: "Informe ao menos um item."

                });

            }

            const resultado = await VendaService.finalizarVenda(

                empresaId,

                {

                    cliente_id: clienteId,

                    usuario_id: usuarioId,

                    forma_pagamento: formaPagamento,

                    status,

                    desconto,

                    acrescimo,

                    observacoes,

                    data_venda: new Date()

                },

                itens

            );

            return res.status(201).json(resultado);

        } catch (error) {

            next(error);

        }

    }

    /* ==========================
       ATUALIZAR VENDA
    ========================== */

    static async atualizar(req, res, next) {

        try {

            const { id } = req.params;

            const empresaId = req.usuario.empresaId;

            const venda = await VendaModel.atualizar(

                id,

                empresaId,

                req.body

            );

            if (!venda) {

                return res.status(404).json({

                    erro: "Venda não encontrada."

                });

            }

            return res.status(200).json({

                mensagem: "Venda atualizada com sucesso.",

                venda

            });

        } catch (error) {

            next(error);

        }

    }

    /* ==========================
       EXCLUIR VENDA
    ========================== */

    static async excluir(req, res, next) {

        try {

            const { id } = req.params;

            const empresaId = req.usuario.empresaId;

            const venda = await VendaModel.excluir(

                id,

                empresaId

            );

            if (!venda) {

                return res.status(404).json({

                    erro: "Venda não encontrada."

                });

            }

            return res.status(200).json({

                mensagem: "Venda removida com sucesso."

            });

        } catch (error) {

            next(error);

        }

    }

    /* ==========================
       TOTAL DE VENDAS
    ========================== */

    static async totalVendas(req, res, next) {

        try {

            const empresaId = req.usuario.empresaId;

            const total = await VendaModel.totalVendas(

                empresaId

            );

            return res.status(200).json(total);

        } catch (error) {

            next(error);

        }

    }

}

module.exports = VendaController;
