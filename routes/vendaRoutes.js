"use strict";

const express = require("express");

const router = express.Router();

const VendaController = require("../controllers/vendaController");

const authMiddleware = require("../middlewares/authMiddleware");

router.use(authMiddleware);

router.get(
    "/",
    VendaController.listar
);

router.get(
    "/estatisticas/total",
    VendaController.totalVendas
);

router.get(
    "/:id",
    VendaController.buscarPorId
);

router.post(
    "/",
    VendaController.criar
);

router.put(
    "/:id",
    VendaController.atualizar
);

router.delete(
    "/:id",
    VendaController.excluir
);

module.exports = router;
