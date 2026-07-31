"use strict";

/* ==================================================
   EXPRESS
================================================== */

const express = require("express");

const router = express.Router();

/* ==================================================
   CONTROLLER
================================================== */

const authController = require("../controllers/authController");

/* ==================================================
   MIDDLEWARES
================================================== */

const authMiddleware = require("../middlewares/authMiddleware");

const validationMiddleware = require("../middlewares/validationMiddleware");

/* ==================================================
   EXPRESS VALIDATOR
================================================== */

const { body } = require("express-validator");

/* ==================================================
   VALIDAÇÕES
================================================== */

const loginValidation = [

    body("email")

        .trim()

        .notEmpty()

        .withMessage("O e-mail é obrigatório.")

        .isEmail()

        .withMessage("Informe um e-mail válido."),

    body("senha")

        .trim()

        .notEmpty()

        .withMessage("A senha é obrigatória.")

];

/* ==================================================
   LOGIN
================================================== */

router.post(

    "/login",

    loginValidation,

    validationMiddleware,

    authController.login

);

/* ==================================================
   PERFIL
================================================== */

router.get(

    "/me",

    authMiddleware,

    authController.me

);

/* ==================================================
   LOGOUT
================================================== */

router.post(

    "/logout",

    authMiddleware,

    authController.logout

);

/* ==================================================
   EXPORTAÇÃO
================================================== */

module.exports = router;