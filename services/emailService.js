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

async function sendOptionalEmail(options) {
    try {
        return await sendEmail(options);
    } catch (error) {
        console.warn("[email] envio ignorado:", error.message);
        return null;
    }
}

function welcomeTemplate({ name }) {
    const safeName = escapeHtml(firstName(name) || "cliente");

    return {
        subject: "Cadastro criado na PetFlow",
        text: `Olá, ${safeName}. Seu cadastro na PetFlow foi criado com sucesso.`,
        html: baseEmail(`
            <h1>Cadastro criado com sucesso</h1>
            <p>Olá, ${safeName}.</p>
            <p>Seu cadastro na PetFlow foi criado. Agora você já pode comprar pela loja, acompanhar seus pedidos e manter seus dados atualizados.</p>
        `)
    };
}

function passwordResetTemplate({ name, resetUrl }) {
    const safeName = escapeHtml(firstName(name) || "cliente");

    return {
        subject: "Redefinição de senha PetFlow",
        text: `Olá, ${safeName}. Use este link para redefinir sua senha: ${resetUrl}`,
        html: baseEmail(`
            <h1>Redefinição de senha</h1>
            <p>Olá, ${safeName}.</p>
            <p>Recebemos uma solicitação para redefinir sua senha na PetFlow.</p>
            <p>
                <a href="${resetUrl}" style="display:inline-block;background:#04766d;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">
                    Criar nova senha
                </a>
            </p>
            <p>Se você não solicitou essa alteração, ignore este e-mail.</p>
            <p style="color:#647481;font-size:13px">Este link expira por segurança.</p>
        `)
    };
}

function orderReceivedTemplate({ name, orderId, total, items = [] }) {
    const safeName = escapeHtml(firstName(name) || "cliente");
    const orderLabel = shortId(orderId);
    const itemList = items.map(item => `
        <li style="padding:10px 0;border-bottom:1px solid #e5edf0">
            ${escapeHtml(item.nome || "Produto")}
            <strong style="float:right">${Number(item.quantidade || 1)}x ${currency(item.valor_unitario)}</strong>
        </li>
    `).join("");

    return {
        subject: `Pedido recebido #${orderLabel} - PetFlow`,
        text: `Olá, ${safeName}. Recebemos seu pedido #${orderLabel} no valor de ${currency(total)}.`,
        html: baseEmail(`
            <h1>Pedido recebido</h1>
            <p>Olá, ${safeName}.</p>
            <p>Recebemos seu pedido <strong>#${orderLabel}</strong>. A PetFlow vai acompanhar a separação e entrega pelo painel administrativo.</p>
            <ul style="list-style:none;padding:0;margin:18px 0;color:#10212b">
                ${itemList}
            </ul>
            <p style="font-size:18px"><strong>Total: ${currency(total)}</strong></p>
        `)
    };
}

function baseEmail(content) {
    return `
        <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:24px;color:#10212b;line-height:1.55">
            ${content}
            <hr style="border:0;border-top:1px solid #e5edf0;margin:24px 0">
            <p style="color:#647481;font-size:13px">PetFlow - cuidado, loja e serviços para pets.</p>
        </div>
    `;
}

function firstName(name) {
    return String(name || "").trim().split(/\s+/)[0];
}

function shortId(id) {
    return String(id || "").slice(0, 8).toUpperCase();
}

function currency(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
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
    sendOptionalEmail,
    welcomeTemplate,
    passwordResetTemplate,
    orderReceivedTemplate
};
