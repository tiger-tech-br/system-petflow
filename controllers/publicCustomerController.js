"use strict";

const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const db = require("../database/connection");
const {
    JWT_SECRET,
    JWT_EXPIRES_IN,
    APP_URL
} = require("../config/env");

const {
    sendEmail,
    sendOptionalEmail,
    welcomeTemplate,
    passwordResetTemplate
} = require("../services/emailService");

async function register(request, response, next) {

    try {

        const data = request.body;

        if (!hasRequiredRegistrationData(data)) {

            return response.status(400).json({
                success: false,
                message: "Informe nome, WhatsApp, e-mail, senha e endereço de entrega."
            });

        }

        const senhaHash = await bcrypt.hash(
            data.senha,
            10
        );

        const empresaIdResult = await db.query(
            "SELECT get_petflow_empresa_id() AS id"
        );

        const empresaId = empresaIdResult.rows[0].id;

        const existing = await db.query(
            `
                SELECT
                    c.id,
                    uc.cliente_id AS usuario_cliente_id
                FROM clientes c
                LEFT JOIN usuarios_clientes uc
                    ON uc.cliente_id = c.id
                WHERE LOWER(c.email) = LOWER($1)
                  AND c.empresa_id = $2
                LIMIT 1
            `,
            [
                data.email,
                empresaId
            ]
        );

        let clienteId = existing.rows[0]?.id;

        if (existing.rows[0]?.usuario_cliente_id) {

            return response.status(409).json({
                success: false,
                message: "Já existe uma conta cadastrada com esse e-mail."
            });

        }

        if (clienteId) {

            await db.query(
                `
                    UPDATE clientes
                    SET
                        nome = $1,
                        telefone = $2,
                        whatsapp = $2,
                        cep = $3,
                        endereco = $4,
                        numero = $5,
                        complemento = $6,
                        bairro = $7,
                        cidade = $8,
                        estado = $9,
                        updated_at = NOW()
                    WHERE id = $10
                      AND empresa_id = $11
                `,
                [
                    data.nome,
                    data.telefone,
                    data.cep || null,
                    data.endereco || null,
                    data.numero || null,
                    data.complemento || null,
                    data.bairro || null,
                    data.cidade || null,
                    data.estado || null,
                    clienteId,
                    empresaId
                ]
            );

        } else {

            const created = await db.query(
                `
                    INSERT INTO clientes (
                        empresa_id,
                        nome,
                        email,
                        telefone,
                        whatsapp,
                        cep,
                        endereco,
                        numero,
                        complemento,
                        bairro,
                        cidade,
                        estado,
                        ativo
                    )
                    VALUES (
                        $1,
                        $2,
                        $3,
                        $4,
                        $4,
                        $5,
                        $6,
                        $7,
                        $8,
                        $9,
                        $10,
                        $11,
                        TRUE
                    )
                    RETURNING id
                `,
                [
                    empresaId,
                    data.nome,
                    data.email.toLowerCase(),
                    data.telefone,
                    data.cep || null,
                    data.endereco || null,
                    data.numero || null,
                    data.complemento || null,
                    data.bairro || null,
                    data.cidade || null,
                    data.estado || null
                ]
            );

            clienteId = created.rows[0].id;

        }

        await db.query(
            `
                INSERT INTO usuarios_clientes (
                    cliente_id,
                    email,
                    senha_hash,
                    email_verificado,
                    ativo
                )
                VALUES (
                    $1,
                    $2,
                    $3,
                    FALSE,
                    TRUE
                )
            `,
            [
                clienteId,
                data.email.toLowerCase(),
                senhaHash
            ]
        );

        const profile = await getProfileById(
            clienteId,
            empresaId
        );

        const template = welcomeTemplate({
            name: profile.nome
        });

        sendOptionalEmail({
            to: profile.email,
            subject: template.subject,
            html: template.html,
            text: template.text
        });

        return response.status(201).json({
            success: true,
            message: "Cadastro criado com sucesso.",
            data: buildAuthPayload(profile)
        });

    } catch (error) {

        return next(error);

    }

}

async function login(request, response, next) {

    try {

        const {
            email,
            senha
        } = request.body;

        const empresaIdResult = await db.query(
            "SELECT get_petflow_empresa_id() AS id"
        );

        const empresaId = empresaIdResult.rows[0].id;

        const { rows } = await db.query(
            `
                SELECT
                    c.*,
                    uc.senha_hash,
                    uc.ativo AS usuario_ativo
                FROM clientes c
                INNER JOIN usuarios_clientes uc
                    ON uc.cliente_id = c.id
                WHERE LOWER(c.email) = LOWER($1)
                  AND c.empresa_id = $2
                LIMIT 1
            `,
            [
                email,
                empresaId
            ]
        );

        const cliente = rows[0];

        if (
            !cliente ||
            !cliente.usuario_ativo ||
            !cliente.ativo
        ) {

            return response.status(401).json({
                success: false,
                message: "E-mail ou senha inválidos."
            });

        }

        const valid = await bcrypt.compare(
            senha,
            cliente.senha_hash
        );

        if (!valid) {

            return response.status(401).json({
                success: false,
                message: "E-mail ou senha inválidos."
            });

        }

        await db.query(
            `
                UPDATE usuarios_clientes
                SET ultimo_login = NOW()
                WHERE cliente_id = $1
            `,
            [cliente.id]
        );

        return response.status(200).json({
            success: true,
            message: "Login realizado com sucesso.",
            data: buildAuthPayload(cliente)
        });

    } catch (error) {

        return next(error);

    }

}

async function forgotPassword(request, response, next) {

    try {

        const { email } = request.body;

        if (!email) {

            return response.status(400).json({
                success: false,
                message: "Informe seu e-mail."
            });

        }

        const empresaIdResult = await db.query(
            "SELECT get_petflow_empresa_id() AS id"
        );

        const empresaId = empresaIdResult.rows[0].id;

        const { rows } = await db.query(
            `
                SELECT
                    c.id,
                    c.nome,
                    c.email,
                    uc.ativo AS usuario_ativo
                FROM clientes c
                INNER JOIN usuarios_clientes uc
                    ON uc.cliente_id = c.id
                WHERE LOWER(c.email) = LOWER($1)
                  AND c.empresa_id = $2
                  AND c.ativo = TRUE
                LIMIT 1
            `,
            [
                email,
                empresaId
            ]
        );

        const cliente = rows[0];

        if (
            !cliente ||
            !cliente.usuario_ativo
        ) {

            return response.status(200).json({
                success: true,
                message: "Se o e-mail estiver cadastrado, enviaremos as instruções de recuperação."
            });

        }

        const token = crypto
            .randomBytes(32)
            .toString("hex");

        const expiresAt = new Date(
            Date.now() + 1000 * 60 * 30
        );

        await db.query(
            `
                UPDATE usuarios_clientes
                SET
                    token_recuperacao = $1,
                    token_expiracao = $2,
                    updated_at = NOW()
                WHERE cliente_id = $3
            `,
            [
                token,
                expiresAt,
                cliente.id
            ]
        );

        const resetUrl =
            `${APP_URL}/redefinir-senha?token=${token}`;

        const template = passwordResetTemplate({
            name: cliente.nome,
            resetUrl
        });

        await sendEmail({
            to: cliente.email,
            subject: template.subject,
            html: template.html,
            text: template.text
        });

        return response.status(200).json({
            success: true,
            message: "Enviamos as instruções de recuperação para seu e-mail."
        });

    } catch (error) {

        return next(error);

    }

}

async function resetPassword(request, response, next) {

    try {

        const {
            token,
            senha
        } = request.body;

        if (
            !token ||
            !senha ||
            String(senha).length < 6
        ) {

            return response.status(400).json({
                success: false,
                message: "Informe o token e uma senha com no mínimo 6 caracteres."
            });

        }

        const { rows } = await db.query(
            `
                SELECT
                    cliente_id
                FROM usuarios_clientes
                WHERE token_recuperacao = $1
                  AND token_expiracao > NOW()
                  AND ativo = TRUE
                LIMIT 1
            `,
            [token]
        );

        const usuarioCliente = rows[0];

        if (!usuarioCliente) {

            return response.status(400).json({
                success: false,
                message: "Link inválido ou expirado."
            });

        }

        const senhaHash = await bcrypt.hash(
            senha,
            10
        );

        await db.query(
            `
                UPDATE usuarios_clientes
                SET
                    senha_hash = $1,
                    token_recuperacao = NULL,
                    token_expiracao = NULL,
                    updated_at = NOW()
                WHERE cliente_id = $2
            `,
            [
                senhaHash,
                usuarioCliente.cliente_id
            ]
        );

        return response.status(200).json({
            success: true,
            message: "Senha redefinida com sucesso."
        });

    } catch (error) {

        return next(error);

    }

}

async function me(request, response, next) {

    try {

        const customer = getAuthenticatedCustomer(
            request,
            response
        );

        if (!customer) {

            return;

        }

        const profile = await getProfileById(
            customer.id,
            customer.empresaId
        );

        if (!profile) {

            return response.status(404).json({
                success: false,
                message: "Cliente não encontrado."
            });

        }

        return response.status(200).json({
            success: true,
            data: profile
        });

    } catch (error) {

        return next(error);

    }

}

async function update(request, response, next) {

    try {

        const data = request.body;

        const customer = getAuthenticatedCustomer(
            request,
            response
        );

        if (!customer) {

            return;

        }

        if (!hasRequiredProfileData(data)) {

            return response.status(400).json({
                success: false,
                message: "Informe nome, WhatsApp e endereço de entrega."
            });

        }

        await db.query(
            `
                UPDATE clientes
                SET
                    nome = $1,
                    telefone = $2,
                    whatsapp = $2,
                    cep = $3,
                    endereco = $4,
                    numero = $5,
                    complemento = $6,
                    bairro = $7,
                    cidade = $8,
                    estado = $9,
                    updated_at = NOW()
                WHERE id = $10
                  AND empresa_id = $11
            `,
            [
                data.nome,
                data.telefone,
                data.cep || null,
                data.endereco || null,
                data.numero || null,
                data.complemento || null,
                data.bairro || null,
                data.cidade || null,
                data.estado || null,
                customer.id,
                customer.empresaId
            ]
        );

        const profile = await getProfileById(
            customer.id,
            customer.empresaId
        );

        return response.status(200).json({
            success: true,
            message: "Dados atualizados com sucesso.",
            data: profile
        });

    } catch (error) {

        return next(error);

    }

}

async function remove(request, response, next) {

    try {

        const customer = getAuthenticatedCustomer(
            request,
            response
        );

        if (!customer) {

            return;

        }

        await db.query(
            `
                UPDATE usuarios_clientes
                SET
                    ativo = FALSE,
                    updated_at = NOW()
                WHERE cliente_id = $1
                  AND EXISTS (
                      SELECT 1
                      FROM clientes c
                      WHERE c.id = usuarios_clientes.cliente_id
                        AND c.empresa_id = $2
                  )
            `,
            [
                customer.id,
                customer.empresaId
            ]
        );

        await db.query(
            `
                UPDATE clientes
                SET
                    ativo = FALSE,
                    updated_at = NOW()
                WHERE id = $1
                  AND empresa_id = $2
            `,
            [
                customer.id,
                customer.empresaId
            ]
        );

        return response.status(200).json({
            success: true,
            message: "Cadastro excluído com sucesso."
        });

    } catch (error) {

        return next(error);

    }

}

async function orders(request, response, next) {

    try {

        const customer = getAuthenticatedCustomer(
            request,
            response
        );

        if (!customer) {

            return;

        }

        const { rows } = await db.query(
            `
                SELECT
                    v.id,
                    v.status,
                    v.forma_pagamento,
                    v.pagseguro_checkout_id,
                    v.pagseguro_checkout_url,
                    v.pagseguro_status,
                    v.pagamento_atualizado_em,
                    v.valor_total,
                    v.valor_final,
                    v.data_venda,
                    COALESCE(
                        JSON_AGG(
                            JSON_BUILD_OBJECT(
                                'produto', COALESCE(
                                    p.nome,
                                    'Produto'
                                ),
                                'quantidade', iv.quantidade,
                                'preco_unitario', COALESCE(
                                    iv.preco_unitario,
                                    0
                                ),
                                'subtotal', iv.subtotal
                            )
                            ORDER BY p.nome
                        ) FILTER (
                            WHERE iv.id IS NOT NULL
                        ),
                        '[]'::JSON
                    ) AS itens
                FROM vendas v
                LEFT JOIN itens_venda iv
                    ON iv.venda_id = v.id
                   AND iv.empresa_id = v.empresa_id
                LEFT JOIN produtos p
                    ON p.id = iv.produto_id
                   AND p.empresa_id = v.empresa_id
                WHERE v.cliente_id = $1
                  AND v.empresa_id = $2
                GROUP BY v.id
                ORDER BY v.data_venda DESC
                LIMIT 50
            `,
            [
                customer.id,
                customer.empresaId
            ]
        );

        return response.status(200).json({
            success: true,
            data: rows
        });

    } catch (error) {

        return next(error);

    }

}

async function getProfileById(id, empresaId) {

    const { rows } = await db.query(
        `
            SELECT
                id,
                empresa_id,
                nome,
                email,
                telefone,
                whatsapp,
                cep,
                endereco,
                numero,
                complemento,
                bairro,
                cidade,
                estado
            FROM clientes
            WHERE id = $1
              AND empresa_id = $2
            LIMIT 1
        `,
        [
            id,
            empresaId
        ]
    );

    return rows[0] || null;

}

function buildAuthPayload(cliente) {

    const user = {
        id: cliente.id,
        empresaId: cliente.empresa_id,
        nome: cliente.nome,
        email: cliente.email,
        telefone: cliente.telefone,
        cep: cliente.cep,
        endereco: cliente.endereco,
        numero: cliente.numero,
        complemento: cliente.complemento,
        bairro: cliente.bairro,
        cidade: cliente.cidade,
        estado: cliente.estado
    };

    const token = jwt.sign(
        {
            type: "customer",
            id: cliente.id,
            empresaId: cliente.empresa_id,
            email: cliente.email,
            nome: cliente.nome
        },
        JWT_SECRET,
        {
            expiresIn: JWT_EXPIRES_IN
        }
    );

    return {
        token,
        user
    };

}

function getAuthenticatedCustomer(request, response) {

    const id = request.customer?.id;
    const empresaId = request.customer?.empresaId;

    if (
        !id ||
        !empresaId
    ) {

        response.status(401).json({
            success: false,
            message: "Sessão inválida. Faça login novamente."
        });

        return null;

    }

    return {
        id,
        empresaId
    };

}

/* ==================================================
   VALIDAÇÕES
================================================== */

function hasRequiredRegistrationData(data) {

    return Boolean(
        hasRequiredProfileData(data) &&
        hasText(data.email) &&
        hasText(data.senha) &&
        String(data.senha).length >= 6
    );

}

function hasRequiredProfileData(data) {

    return Boolean(
        hasText(data?.nome) &&
        hasText(data?.telefone) &&
        hasRequiredAddressData(data)
    );

}

function hasRequiredAddressData(data) {

    return Boolean(
        hasText(data?.cep) &&
        hasText(data?.endereco) &&
        hasText(data?.numero) &&
        hasText(data?.bairro) &&
        hasText(data?.cidade) &&
        hasText(data?.estado)
    );

}

function hasText(value) {

    return (
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
    );

}

/* ==================================================
   EXPORTAÇÃO
================================================== */

module.exports = {
    register,
    login,
    forgotPassword,
    resetPassword,
    me,
    update,
    remove,
    orders
};
