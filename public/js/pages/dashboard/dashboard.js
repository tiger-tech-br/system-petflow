/* ==================================================
   PETFLOW
   DASHBOARD.JS
================================================== */

"use strict";


/* ==================================================
   ELEMENTOS
================================================== */

const btnAtualizar = document.querySelector("#btnAtualizar");


/* ==================================================
   EVENTOS
================================================== */

document.addEventListener("DOMContentLoaded", inicializarDashboard);

if (btnAtualizar) {

    btnAtualizar.addEventListener("click", atualizarDashboard);

}


/* ==================================================
   INICIALIZAÇÃO
================================================== */

async function inicializarDashboard() {

    try {

        await carregarDashboard();

    } catch (error) {

        console.error("Erro ao iniciar o Dashboard:", error);

    }

}


/* ==================================================
   DASHBOARD
================================================== */

async function carregarDashboard() {

    console.log("Dashboard carregado.");

    // Futuramente:
    // await carregarIndicadores();
    // await carregarPedidosRecentes();
    // await carregarAgendamentosHoje();
    // await carregarFinanceiro();
    // await carregarNotificacoes();

}


/* ==================================================
   ATUALIZAR DASHBOARD
================================================== */

async function atualizarDashboard() {

    try {

        console.log("Atualizando Dashboard...");

        await carregarDashboard();

    } catch (error) {

        console.error("Erro ao atualizar Dashboard:", error);

    }

}


/* ==================================================
   INDICADORES
================================================== */

async function carregarIndicadores() {

    // Implementação futura

}


/* ==================================================
   PEDIDOS RECENTES
================================================== */

async function carregarPedidosRecentes() {

    // Implementação futura

}


/* ==================================================
   AGENDAMENTOS
================================================== */

async function carregarAgendamentosHoje() {

    // Implementação futura

}


/* ==================================================
   FINANCEIRO
================================================== */

async function carregarFinanceiro() {

    // Implementação futura

}


/* ==================================================
   NOTIFICAÇÕES
================================================== */

async function carregarNotificacoes() {

    // Implementação futura

}