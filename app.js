"use strict";

/* ==================================================
   DEPENDÊNCIAS
================================================== */

require("dotenv").config();

const express = require("express");

const path = require("path");

/* ==================================================
   MIDDLEWARES
================================================== */

const securityMiddleware = require("./middlewares/securityMiddleware");

const errorMiddleware = require("./middlewares/errorMiddleware");

/* ==================================================
   ROTAS
================================================== */

const authRoutes = require("./routes/authRoutes");

const clienteRoutes = require("./routes/clienteRoutes");

const petRoutes = require("./routes/petRoutes");

const agendamentoRoutes = require("./routes/agendamentoRoutes");

const funcionarioRoutes = require("./routes/funcionarioRoutes");

const empresaRoutes = require("./routes/empresaRoutes");

const categoriaRoutes = require("./routes/categoriaRoutes");

const produtoRoutes = require("./routes/produtoRoutes");

const estoqueRoutes = require("./routes/estoqueRoutes");

const vendaRoutes = require("./routes/vendaRoutes");

const itemVendaRoutes = require("./routes/itemVendaRoutes");

const servicoRoutes = require("./routes/servicoRoutes");

const fornecedorRoutes = require("./routes/fornecedorRoutes");

const compraRoutes = require("./routes/compraRoutes");

const itemCompraRoutes = require("./routes/itemCompraRoutes");

/* ==========================
   DASHBOARD
========================== */

const dashboardRoutes = require("./routes/dashboardRoutes");

/* ==================================================
   APP
================================================== */

const app = express();

/* ==================================================
   SEGURANÇA
================================================== */

securityMiddleware(app);

/* ==================================================
   MIDDLEWARES NATIVOS
================================================== */

app.use(express.json());

app.use(express.urlencoded({

    extended: true

}));

/* ==================================================
   ARQUIVOS ESTÁTICOS
================================================== */

app.use(express.static(path.join(__dirname, "public")));

app.use("/admin", express.static(path.join(__dirname, "admin")));

/* ==================================================
   ROTA INICIAL
================================================== */

app.get("/", (request, response) => {

    response.status(200).json({

        success: true,

        message: "🐾 Bem-vindo à API do PetFlow."

    });

});

/* ==================================================
   ROTAS API
================================================== */

app.use("/api/auth", authRoutes);

app.use("/api/clientes", clienteRoutes);

app.use("/api/pets", petRoutes);

app.use("/api/agendamentos", agendamentoRoutes);

app.use("/api/funcionarios", funcionarioRoutes);

app.use("/api/empresa", empresaRoutes);

app.use("/api/categorias", categoriaRoutes);

app.use("/api/produtos", produtoRoutes);

app.use("/api/estoque", estoqueRoutes);

app.use("/api/vendas", vendaRoutes);

app.use("/api/itens-venda", itemVendaRoutes);

app.use("/api/servicos", servicoRoutes);

app.use("/api/fornecedores", fornecedorRoutes);

app.use("/api/compras", compraRoutes);

app.use("/api/itens-compra", itemCompraRoutes);

/* ==========================
   DASHBOARD
========================== */

app.use("/api/dashboard", dashboardRoutes);

/* ==================================================
   ROTA NÃO ENCONTRADA
================================================== */

app.use((request, response) => {

    response.status(404).json({

        success: false,

        message: "Rota não encontrada."

    });

});

/* ==================================================
   MIDDLEWARE DE ERRO
================================================== */

app.use(errorMiddleware);

/* ==================================================
   EXPORTAÇÃO
================================================== */

module.exports = app;
