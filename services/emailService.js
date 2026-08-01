"use strict";

const {
    RESEND_API_KEY,
    EMAIL_FROM
} = require("../config/env");

async function sendEmail({ to, subject, html, text }) {
    if (!RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY não configurada no .env.");
    }

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            from: EMAIL_FROM,
            to,
            subject,
            html,
            text
        })
    });

    const payload = await response.json();

    if (!response.ok) {
        throw new Error(payload.message || "Não foi possível enviar o e-mail.");
    }

    return payload;
}

function passwordResetTemplate({ name, resetUrl }) {
    const safeName = escapeHtml(name || "cliente");

    return {
        subject: "Redefinição de senha PetFlow",
        text: `Olá, ${safeName}. Use este link para redefinir sua senha: ${resetUrl}`,
        html: `
            <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:24px;color:#10212b">
                <h1 style="margin:0 0 12px;font-size:24px">Redefinição de senha</h1>
                <p>Olá, ${safeName}.</p>
                <p>Recebemos uma solicitação para redefinir sua senha na PetFlow.</p>
                <p>
                    <a href="${resetUrl}" style="display:inline-block;background:#04766d;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">
                        Criar nova senha
                    </a>
                </p>
                <p>Se você não solicitou essa alteração, ignore este e-mail.</p>
                <p style="color:#647481;font-size:13px">Este link expira por segurança.</p>
            </div>
        `
    };
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

module.exports = {
    sendEmail,
    passwordResetTemplate
};
