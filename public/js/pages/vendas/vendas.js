"use strict";

/* ==================================================
   ELEMENTOS
================================================== */

const tabelaVendas = document.querySelector("#tabelaVendas");

const formularioVenda = document.querySelector("#formVenda");

const btnNovaVenda = document.querySelector("#btnNovaVenda");

const btnSalvarVenda = document.querySelector("#btnSalvarVenda");

const btnCancelarVenda = document.querySelector("#btnCancelarVenda");

const btnFecharModal = document.querySelector("#btnFecharModal");

const modalVenda = document.querySelector("#modalVenda");

const modalConfirmacao = document.querySelector("#modalConfirmacao");

const pesquisarVenda = document.querySelector("#pesquisarVenda");

/* ==================================================
   ESTADO
================================================== */

let vendaEditando = null;

let vendaSelecionada = null;

/* ==================================================
   INICIALIZAÇÃO
================================================== */

document.addEventListener(

    "DOMContentLoaded",

    inicializar

);

/* ==================================================
   INICIALIZAR
================================================== */

function inicializar() {

    configurarEventos();

    carregarVendas();

}

/* ==================================================
   EVENTOS
================================================== */

function configurarEventos() {

    if (formularioVenda) {

        formularioVenda.addEventListener(

            "submit",

            salvarVenda

        );

    }

    if (btnNovaVenda) {

        btnNovaVenda.addEventListener(

            "click",

            abrirModalVenda

        );

    }

    if (btnCancelarVenda) {

        btnCancelarVenda.addEventListener(

            "click",

            cancelarVendaAtual

        );

    }

    if (btnFecharModal) {

        btnFecharModal.addEventListener(

            "click",

            fecharModalVenda

        );

    }

    if (pesquisarVenda) {

        pesquisarVenda.addEventListener(

            "input",

            pesquisarVendas

        );

    }

    configurarEventosTabela();

}

/* ==================================================
   EVENTOS DA TABELA
================================================== */

function configurarEventosTabela() {

    if (!tabelaVendas) return;

    tabelaVendas.addEventListener(

        "click",

        eventoTabela

    );

}

/* ==================================================
   DELEGAÇÃO DE EVENTOS
================================================== */

function eventoTabela(event) {

    const botao = event.target.closest("button");

    if (!botao) return;

    const id = Number(

        botao.dataset.id

    );

    if (botao.classList.contains("btn-editar")) {

        editarVenda(id);

        return;

    }

    if (botao.classList.contains("btn-excluir")) {

        excluirVenda(id);

        return;

    }

    if (botao.classList.contains("btn-finalizar")) {

        finalizarVenda(id);

        return;

    }

    if (botao.classList.contains("btn-cancelar")) {

        cancelarVenda(id);

        return;

    }

}

/* ==================================================
   MODAL
================================================== */

function abrirModalVenda() {

    vendaEditando = null;

    formularioVenda.reset();

    modalVenda.showModal();

}

function fecharModalVenda() {

    modalVenda.close();

}

function cancelarVendaAtual() {

    formularioVenda.reset();

    vendaEditando = null;

    fecharModalVenda();

}

/* ==================================================
   CARREGAR VENDAS
================================================== */

async function carregarVendas() {

    try {

        const vendas = await VendaService.getAll();

        renderizarTabela(vendas);

    }

    catch (error) {

        console.error(error);

        alert("Erro ao carregar as vendas.");

    }

}

/* ==================================================
   RENDERIZAR TABELA
================================================== */

function renderizarTabela(vendas) {

    if (!tabelaVendas) return;

    tabelaVendas.replaceChildren();

    if (!Array.isArray(vendas) || vendas.length === 0) {

        tabelaVendas.appendChild(

            criarLinhaSemRegistros()

        );

        return;

    }

    vendas.forEach(venda => {

        tabelaVendas.appendChild(

            criarLinhaVenda(venda)

        );

    });

}

/* ==================================================
   LINHA SEM REGISTROS
================================================== */

function criarLinhaSemRegistros() {

    const tr = document.createElement("tr");

    const td = document.createElement("td");

    td.colSpan = 6;

    td.textContent = "Nenhuma venda encontrada.";

    td.classList.add("text-center");

    tr.appendChild(td);

    return tr;

}

/* ==================================================
   LINHA DA VENDA
================================================== */

function criarLinhaVenda(venda) {

    const tr = document.createElement("tr");

    tr.append(

        criarColuna(venda.id),

        criarColuna(

            venda.cliente || "-"

        ),

        criarColuna(

            venda.forma_pagamento

        ),

        criarColuna(

            formatarMoeda(venda.total)

        ),

        criarColuna(

            venda.status

        ),

        criarColunaAcoes(venda.id)

    );

    return tr;

}

/* ==================================================
   COLUNA
================================================== */

function criarColuna(valor) {

    const td = document.createElement("td");

    td.textContent = valor;

    return td;

}

/* ==================================================
   COLUNA DE AÇÕES
================================================== */

function criarColunaAcoes(id) {

    const td = document.createElement("td");

    td.append(

        criarBotao(

            "Editar",

            "btn-editar",

            id

        ),

        criarBotao(

            "Excluir",

            "btn-excluir",

            id

        ),

        criarBotao(

            "Finalizar",

            "btn-finalizar",

            id

        ),

        criarBotao(

            "Cancelar",

            "btn-cancelar",

            id

        )

    );

    return td;

}

/* ==================================================
   BOTÃO
================================================== */

function criarBotao(

    texto,

    classe,

    id

) {

    const button = document.createElement(

        "button"

    );

    button.type = "button";

    button.textContent = texto;

    button.dataset.id = id;

    button.className = classe;

    return button;

}

/* ==================================================
   FORMATAR MOEDA
================================================== */

function formatarMoeda(valor) {

    return Number(valor).toLocaleString(

        "pt-BR",

        {

            style: "currency",

            currency: "BRL"

        }

    );

}

/* ==================================================
   SALVAR
================================================== */

async function salvarVenda(event) {

    event.preventDefault();

    const formaPagamento = document.querySelector(

        "#formaPagamento"

    );

    if (

        !validateRequired(

            formaPagamento,

            "Selecione a forma de pagamento."

        )

    ) {

        return;

    }

    try {

        const venda = obterDadosFormulario();

        if (vendaEditando) {

            await VendaService.update(

                vendaEditando,

                venda

            );

        }

        else {

            await VendaService.create(

                venda

            );

        }

        formularioVenda.reset();

        vendaEditando = null;

        fecharModalVenda();

        carregarVendas();

    }

    catch (error) {

        console.error(error);

        alert("Erro ao salvar a venda.");

    }

}

/* ==================================================
   EDITAR
================================================== */

async function editarVenda(id) {

    try {

        const venda = await VendaService.getById(id);

        vendaEditando = id;

        preencherFormulario(venda);

        abrirModalVenda();

    }

    catch (error) {

        console.error(error);

        alert("Erro ao carregar a venda.");

    }

}

/* ==================================================
   EXCLUIR
================================================== */

async function excluirVenda(id) {

    if (

        !confirm(

            "Deseja realmente excluir esta venda?"

        )

    ) {

        return;

    }

    try {

        await VendaService.delete(id);

        carregarVendas();

    }

    catch (error) {

        console.error(error);

        alert("Erro ao excluir a venda.");

    }

}

/* ==================================================
   FINALIZAR
================================================== */

async function finalizarVenda(id) {

    try {

        await VendaService.finish(id);

        carregarVendas();

    }

    catch (error) {

        console.error(error);

        alert("Erro ao finalizar a venda.");

    }

}

/* ==================================================
   CANCELAR
================================================== */

async function cancelarVenda(id) {

    if (

        !confirm(

            "Cancelar esta venda?"

        )

    ) {

        return;

    }

    try {

        await VendaService.cancel(id);

        carregarVendas();

    }

    catch (error) {

        console.error(error);

        alert("Erro ao cancelar a venda.");

    }

}

/* ==================================================
   PESQUISA
================================================== */

function pesquisarVendas(event) {

    const texto = event.target.value

        .trim()

        .toLowerCase();

    const linhas = tabelaVendas.querySelectorAll("tr");

    linhas.forEach(linha => {

        linha.style.display =

            linha.textContent

                .toLowerCase()

                .includes(texto)

            ?""

            : "none";

    });

}

/* ==================================================
   DADOS DO FORMULÁRIO
================================================== */

function obterDadosFormulario() {

    return {

        clienteId:

            document.querySelector(

                "#clienteId"

            )?.value || null,

        formaPagamento:

            document.querySelector(

                "#formaPagamento"

            ).value,

        observacoes:

            document.querySelector(

                "#observacoes"

            ).value.trim(),

        desconto:

            Number(

                document.querySelector(

                    "#desconto"

                )?.value || 0

            ),

        acrescimo:

            Number(

                document.querySelector(

                    "#acrescimo"

                )?.value || 0

            )

    };

}

/* ==================================================
   PREENCHER FORMULÁRIO
================================================== */

function preencherFormulario(venda) {

    document.querySelector(

        "#formaPagamento"

    ).value = venda.forma_pagamento;

    document.querySelector(

        "#observacoes"

    ).value = venda.observacoes || "";

    document.querySelector(

        "#desconto"

    ).value = venda.desconto || 0;

    document.querySelector(

        "#acrescimo"

    ).value = venda.acrescimo || 0;

}

/* ==================================================
   LIMPAR FORMULÁRIO
================================================== */

function limparFormulario() {

    formularioVenda.reset();

    vendaEditando = null;

}

/* ==================================================
   EXPORTAÇÃO
================================================== */

window.editarVenda = editarVenda;

window.excluirVenda = excluirVenda;

window.finalizarVenda = finalizarVenda;

window.cancelarVenda = cancelarVenda;
