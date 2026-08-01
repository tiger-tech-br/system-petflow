"use strict";

const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const db = require("../database/connection");
const { JWT_SECRET, JWT_EXPIRES_IN, APP_URL } = require("../config/env");
const {
    sendEmail,
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

        const senhaHash = await bcrypt.hash(data.senha, 10);
        const empresaIdResult = await db.query("SELECT get_petflow_empresa_id() AS id");
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
                LIMIT 1
            `,
            [data.email]
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
                    clienteId
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
                    VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$8,$9,$10,$11,TRUE)
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
                INSERT INTO usuarios_clientes (cliente_id, email, senha_hash, email_verificado, ativo)
                VALUES ($1, $2, $3, FALSE, TRUE)
            `,
            [clienteId, data.email.toLowerCase(), senhaHash]
        );

        const profile = await getProfileById(clienteId);

        return response.status(201).json({
            success: true,
            message: "Cadastro criado com sucesso.",
            data: buildAuthPayload(profile)
        });
    } catch (error) {
        next(error);
    }
}

async function login(request, response, next) {
    try {
        const { email, senha } = request.body;

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
                LIMIT 1
            `,
            [email]
        );

        const cliente = rows[0];

        if (!cliente || !cliente.usuario_ativo || !cliente.ativo) {
            return response.status(401).json({
                success: false,
                message: "E-mail ou senha inválidos."
            });
        }

        const valid = await bcrypt.compare(senha, cliente.senha_hash);

        if (!valid) {
            return response.status(401).json({
                success: false,
                message: "E-mail ou senha inválidos."
            });
        }

        await db.query(
            "UPDATE usuarios_clientes SET ultimo_login = NOW() WHERE cliente_id = $1",
            [cliente.id]
        );

        return response.status(200).json({
            success: true,
            message: "Login realizado com sucesso.",
            data: buildAuthPayload(cliente)
        });
    } catch (error) {
        next(error);
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
                AND c.ativo = TRUE
                LIMIT 1
            `,
            [email]
        );

        const cliente = rows[0];

        if (!cliente || !cliente.usuario_ativo) {
            return response.status(200).json({
                success: true,
                message: "Se o e-mail estiver cadastrado, enviaremos as instruções de recuperação."
            });
        }

        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

        await db.query(
            `
                UPDATE usuarios_clientes
                SET token_recuperacao = $1,
                    token_expiracao = $2,
                    updated_at = NOW()
                WHERE cliente_id = $3
            `,
            [token, expiresAt, cliente.id]
        );

        const resetUrl = `${APP_URL}/redefinir-senha?token=${token}`;
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
        next(error);
    }
}

async function resetPassword(request, response, next) {
    try {
        const { token, senha } = request.body;

        if (!token || !senha || String(senha).length < 6) {
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

        const senhaHash = await bcrypt.hash(senha, 10);

        await db.query(
            `
                UPDATE usuarios_clientes
                SET senha_hash = $1,
                    token_recuperacao = NULL,
                    token_expiracao = NULL,
                    updated_at = NOW()
                WHERE cliente_id = $2
            `,
            [senhaHash, usuarioCliente.cliente_id]
        );

        return response.status(200).json({
            success: true,
            message: "Senha redefinida com sucesso."
        });
    } catch (error) {
        next(error);
    }
}

async function me(request, response, next) {
    try {
        const profile = await getProfileById(request.customer.id);

        return response.status(200).json({
            success: true,
            data: profile
        });
    } catch (error) {
        next(error);
    }
}

async function update(request, response, next) {
    try {
        const data = request.body;

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
                request.customer.id
            ]
        );

        const profile = await getProfileById(request.customer.id);

        return response.status(200).json({
            success: true,
            message: "Dados atualizados com sucesso.",
            data: profile
        });
    } catch (error) {
        next(error);
    }
}

async function remove(request, response, next) {
    try {
        await db.query(
            `
                UPDATE usuarios_clientes
                SET ativo = FALSE,
                    updated_at = NOW()
                WHERE cliente_id = $1
            `,
            [request.customer.id]
        );

        await db.query(
            `
                UPDATE clientes
                SET ativo = FALSE,
                    updated_at = NOW()
                WHERE id = $1
            `,
            [request.customer.id]
        );

        return response.status(200).json({
            success: true,
            message: "Cadastro excluído com sucesso."
        });
    } catch (error) {
        next(error);
    }
}

async function orders(request, response, next) {
    try {
        const { rows } = await db.query(
            `
                SELECT
                    v.id,
                    v.status,
                    v.forma_pagamento,
                    v.valor_total,
                    v.valor_final,
                    v.created_at,
                    COALESCE(
                        JSON_AGG(
                            JSON_BUILD_OBJECT(
                                'produto', COALESCE(p.nome, 'Produto'),
                                'quantidade', iv.quantidade,
                                'valor_unitario', COALESCE(iv.valor_unitario, iv.preco_unitario, 0),
                                'subtotal', iv.subtotal
                            )
                            ORDER BY p.nome
                        ) FILTER (WHERE iv.id IS NOT NULL),
                        '[]'::JSON
                    ) AS itens
                FROM vendas v
                LEFT JOIN itens_venda iv
                    ON iv.venda_id = v.id
                LEFT JOIN produtos p
                    ON p.id = iv.produto_id
                WHERE v.cliente_id = $1
                GROUP BY v.id
                ORDER BY v.created_at DESC
                LIMIT 50
            `,
            [request.customer.id]
        );

        return response.status(200).json({
            success: true,
            data: rows
        });
    } catch (error) {
        next(error);
    }
}

async function getProfileById(id) {
    const { rows } = await db.query(
        `
            SELECT
                id,
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
            LIMIT 1
        `,
        [id]
    );

    return rows[0] || null;
}

function buildAuthPayload(cliente) {
    const user = {
        id: cliente.id,
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
            email: cliente.email,
            nome: cliente.nome
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );

    return {
        token,
        user
    };
}

function hasRequiredRegistrationData(data) {
    return Boolean(
        data?.nome &&
        data?.email &&
        data?.telefone &&
        data?.senha &&
        data?.endereco &&
        data?.numero &&
        data?.bairro &&
        data?.cidade &&
        data?.estado
    );
}

function hasRequiredProfileData(data) {
    return Boolean(
        data?.nome &&
        data?.telefone &&
        data?.endereco &&
        data?.numero &&
        data?.bairro &&
        data?.cidade &&
        data?.estado
    );
}

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
