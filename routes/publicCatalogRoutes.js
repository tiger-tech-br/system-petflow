"use strict";

const express = require("express");

const publicCatalogController = require("../controllers/publicCatalogController");
const publicOrderController = require("../controllers/publicOrderController");
const publicCustomerController = require("../controllers/publicCustomerController");
const customerAuthMiddleware = require("../middlewares/customerAuthMiddleware");

const router = express.Router();

router.get("/produtos", publicCatalogController.produtos);
router.get("/categorias", publicCatalogController.categorias);
router.get("/servicos", publicCatalogController.servicos);
router.post("/clientes/cadastro", publicCustomerController.register);
router.post("/clientes/login", publicCustomerController.login);
router.get("/clientes/me", customerAuthMiddleware, publicCustomerController.me);
router.put("/clientes/me", customerAuthMiddleware, publicCustomerController.update);
router.get("/clientes/pedidos", customerAuthMiddleware, publicCustomerController.orders);
router.post("/pedidos", customerAuthMiddleware, publicOrderController.criarPedido);

module.exports = router;
