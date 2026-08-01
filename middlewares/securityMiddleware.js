"use strict";

/* ==================================================
   DEPENDÊNCIAS
================================================== */

const helmet = require("helmet");

const cors = require("cors");

const compression = require("compression");

const hpp = require("hpp");

const cookieParser = require("cookie-parser");

const morgan = require("morgan");

const rateLimit = require("express-rate-limit");

/* ==================================================
   RATE LIMIT
================================================== */

const limiter = rateLimit({

    windowMs: 15 * 60 * 1000,

    max: process.env.NODE_ENV === "production" ? 100 : 1000,

    standardHeaders: true,

    legacyHeaders: false,

    message: {

        success: false,

        message: "Muitas requisições. Tente novamente em alguns minutos."

    }

});

/* ==================================================
   CORS
================================================== */

const corsOptions = {

    origin: process.env.FRONTEND_URL,

    credentials: true,

    methods: [

        "GET",

        "POST",

        "PUT",

        "PATCH",

        "DELETE"

    ]

};

/* ==================================================
   SEGURANÇA
================================================== */

function securityMiddleware(app) {

    /* Helmet */

    app.use(helmet());

    /* Compressão */

    app.use(compression());

    /* Cookie Parser */

    app.use(cookieParser());

    /* HTTP Parameter Pollution */

    app.use(hpp());

    /* CORS */

    app.use(cors(corsOptions));

    /* Logs */

    app.use(morgan("dev"));

    /* Rate Limit */

    app.use(limiter);

}

/* ==================================================
   EXPORTAÇÃO
================================================== */

module.exports = securityMiddleware;
