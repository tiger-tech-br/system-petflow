"use strict";

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const authModel = require("../models/authModel");
const {
    JWT_SECRET,
    JWT_EXPIRES_IN
} = require("../config/env");

async function login(request, response, next) {
    try {
        const { email } = request.body;
        const senha = request.body.senha || request.body.password;

        const usuario = await authModel.findByEmail(email);

        if (!usuario || !usuario.status) {
            return response.status(401).json({
                success: false,
                message: "E-mail ou senha invalidos."
            });
        }

        const senhaValida = await bcrypt.compare(
            senha,
            usuario.senha
        );

        if (!senhaValida) {
            return response.status(401).json({
                success: false,
                message: "E-mail ou senha invalidos."
            });
        }

        await authModel.updateLastLogin(usuario.id);

        const payload = {
            id: usuario.id,
            empresaId: usuario.empresa_id,
            empresa_id: usuario.empresa_id,
            nome: usuario.nome,
            email: usuario.email,
            cargo: usuario.cargo,
            perfil: usuario.cargo
        };

        const token = jwt.sign(
            payload,
            JWT_SECRET,
            {
                expiresIn: JWT_EXPIRES_IN
            }
        );

        return response.status(200).json({
            success: true,
            message: "Login realizado com sucesso.",
            data: {
                token,
                user: payload
            }
        });
    } catch (error) {
        next(error);
    }
}

async function me(request, response, next) {
    try {
        return response.status(200).json({
            success: true,
            data: request.user
        });
    } catch (error) {
        next(error);
    }
}

async function logout(request, response, next) {
    try {
        return response.status(200).json({
            success: true,
            message: "Logout realizado com sucesso."
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    login,
    me,
    logout
};
