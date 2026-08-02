"use strict";

const db = require("../database/connection");
const VendaService = require("../services/vendaService");
const {
    sendOptionalEmail,
    orderReceivedTemplate
} = require("../services/emailService");

async function criarPedido(request, response, next) {
    try {
        const {
            itens = [],
            formaPagamento = "PIX",
            observacoes = ""
        } = request.body;

        if (!Array.isArray(itens) || itens.length === 0) {
            return response.status(400).json({
                success: false,
                message: "Adicione ao menos um produto na sacola."
            });
        }

        const empresaIdResult = await db.query("SELECT get_petflow_empresa_id() AS id");
        const empresaId = empresaIdResult.rows[0].id;
        const cliente = await getCliente(request.customer.id);
        const itensDetalhados = await getItensDetalhados(itens);

        const pedido = await VendaService.finalizarVenda(
            empresaId,
            {
                cliente_id: cliente.id,
                forma_pagamento: formaPagamento,
                status: "AGUARDANDO_PAGAMENTO",
                desconto: 0,
                acrescimo: 0,
                observacoes: montarObservacoes(cliente, observacoes),
                data_venda: new Date()
            },
            itens.map(item => ({
                produto_id: item.produto_id || item.produtoId,
                quantidade: Number(item.quantidade || 1),
                valor_unitario: Number(item.valor_unitario || item.valorUnitario || 0)
            }))
        );

        const emailTemplate = orderReceivedTemplate({
            name: cliente.nome,
            orderId: pedido.venda.id,
            total: pedido.venda.valor_total,
            items: itensDetalhados
        });

        sendOptionalEmail({
            to: cliente.email,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text
        });

        return response.status(201).json({
            success: true,
            message: "Pedido recebido com sucesso.",
            data: {
                ...pedido.venda,
                itens: pedido.itens
            }
        });
    } catch (error) {
        next(error);
    }
}

async function getCliente(id) {
    const { rows } = await db.query(
        `
            SELECT
                id,
                nome,
                email,
                telefone,
                cep,
                endereco,
                numero,
                complemento,
                bairro,
                cidade,
                estado
            FROM clientes
            WHERE id = $1
            LIMIT 1
        `,
        [id]
    );

    if (!rows[0]) {
        throw new Error("Cliente não encontrado.");
    }

    return rows[0];
}

async function getItensDetalhados(itens) {
    const ids = itens
        .map(item => item.produto_id || item.produtoId)
        .filter(Boolean);

    if (!ids.length) {
        return [];
    }

    const { rows } = await db.query(
        `
            SELECT
                id,
                nome
            FROM produtos
            WHERE id = ANY($1::uuid[])
        `,
        [ids]
    );

    return itens.map(item => {
        const produtoId = item.produto_id || item.produtoId;
        const produto = rows.find(row => row.id === produtoId);

        return {
            nome: produto?.nome || "Produto",
            quantidade: Number(item.quantidade || 1),
            valor_unitario: Number(item.valor_unitario || item.valorUnitario || 0)
        };
    });
}

function montarObservacoes(cliente, observacoes) {
    const endereco = [
        cliente.endereco,
        cliente.numero,
        cliente.complemento,
        cliente.bairro,
        cliente.cidade,
        cliente.estado
    ].filter(Boolean).join(", ");

    return [
        "Pedido realizado pela loja pública.",
        endereco ?`Endereço: ${endereco}` : "",
        observacoes ?`Observações: ${observacoes}` : ""
    ].filter(Boolean).join("\n");
}

module.exports = {
    criarPedido
};
