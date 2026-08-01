"use strict";

/* ==================================================
   DOTENV
================================================== */

require("dotenv").config();

/* ==================================================
   VARIÁVEIS OBRIGATÓRIAS
================================================== */

const requiredVariables = [

    "PORT",

    "DB_HOST",

    "DB_PORT",

    "DB_NAME",

    "DB_USER",

    "DB_PASSWORD",

    "JWT_SECRET",

    "JWT_EXPIRES_IN",

    "CLOUDINARY_CLOUD_NAME",

    "CLOUDINARY_API_KEY",

    "CLOUDINARY_API_SECRET"

];

/* ==================================================
   VALIDAÇÃO
================================================== */

requiredVariables.forEach(variable => {

    if (!process.env[variable]) {

        throw new Error(

            `Variável de ambiente não encontrada: ${variable}`

        );

    }

});

/* ==================================================
   EXPORTAÇÃO
================================================== */

module.exports = {

    PORT: process.env.PORT,

    DB_HOST: process.env.DB_HOST,

    DB_PORT: process.env.DB_PORT,

    DB_NAME: process.env.DB_NAME,

    DB_USER: process.env.DB_USER,

    DB_PASSWORD: process.env.DB_PASSWORD,

    JWT_SECRET: process.env.JWT_SECRET,

    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,

    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,

    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,

    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

    RESEND_API_KEY: process.env.RESEND_API_KEY,

    EMAIL_FROM: process.env.EMAIL_FROM || "PetFlow <suporte@tigertech.dev.br>",

    EMAIL_TEST_TO: process.env.EMAIL_TEST_TO || "suporte@tigertech.dev.br",

    APP_URL: process.env.APP_URL || `http://localhost:${process.env.PORT || 4500}`

};
