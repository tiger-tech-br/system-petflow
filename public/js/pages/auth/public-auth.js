"use strict";

const CUSTOMER_API = window.location.hostname === "localhost"
    ?"http://localhost:4500/api/public"
    : "/api/public";

document.addEventListener("DOMContentLoaded", () => {
    setupTabs();
    setupPublicLogin();
    setupPublicRegister();
    setupPublicAccount();
    setupPublicOrders();
    setupCepLookup();
    setupForgotPassword();
    setupPublicResetPassword();
});

function setupTabs() {
    document.querySelectorAll("[data-auth-tab]").forEach(button => {
        button.addEventListener("click", () => {
            const tab = button.dataset.authTab;
            document.querySelectorAll("[data-auth-tab]").forEach(item => item.classList.toggle("active", item === button));
            document.querySelectorAll(".auth-panel").forEach(panel => panel.classList.remove("active"));
            document.getElementById(tab === "login" ?"publicLoginForm" : "publicRegisterForm")?.classList.add("active");
        });
    });
}

function setupPublicLogin() {
    const form = document.getElementById("publicLoginForm");

    form?.addEventListener("submit", async event => {
        event.preventDefault();
        const status = document.getElementById("loginStatus");
        setStatus(status, "Entrando...");

        try {
            const payload = await request("/clientes/login", "POST", Object.fromEntries(new FormData(form).entries()));
            saveCustomer(payload.data);
            window.location.href = "/";
        } catch (error) {
            setStatus(status, error.message);
        }
    });
}

function setupPublicRegister() {
    const form = document.getElementById("publicRegisterForm");

    form?.addEventListener("submit", async event => {
        event.preventDefault();
        const status = document.getElementById("registerStatus");
        setStatus(status, "Criando cadastro...");

        try {
            const payload = await request("/clientes/cadastro", "POST", Object.fromEntries(new FormData(form).entries()));
            saveCustomer(payload.data);
            window.location.href = "/";
        } catch (error) {
            setStatus(status, error.message);
        }
    });
}

async function setupPublicAccount() {
    const form = document.getElementById("publicAccountForm");

    if (!form) {
        return;
    }

    const token = localStorage.getItem("petflow_customer_token");

    if (!token) {
        window.location.href = "/login";
        return;
    }

    const status = document.getElementById("accountStatus");

    try {
        const payload = await request("/clientes/me", "GET");
        fillForm(form, payload.data);
        localStorage.setItem("petflow_customer_user", JSON.stringify(payload.data));
    } catch {
        localStorage.removeItem("petflow_customer_token");
        window.location.href = "/login";
        return;
    }

    form.addEventListener("submit", async event => {
        event.preventDefault();
        setStatus(status, "Salvando...");

        try {
            const payload = await request("/clientes/me", "PUT", Object.fromEntries(new FormData(form).entries()));
            localStorage.setItem("petflow_customer_user", JSON.stringify(payload.data));
            setStatus(status, "Dados atualizados com sucesso.");
        } catch (error) {
            setStatus(status, error.message);
        }
    });

    document.getElementById("publicLogout")?.addEventListener("click", () => {
        localStorage.removeItem("petflow_customer_token");
        localStorage.removeItem("petflow_customer_user");
        window.location.href = "/";
    });

    document.getElementById("publicDeleteAccount")?.addEventListener("click", async () => {
        const confirmed = window.confirm("Tem certeza que deseja excluir seu cadastro? Você perderá o acesso à área do cliente.");

        if (!confirmed) {
            return;
        }

        setStatus(status, "Excluindo cadastro...");

        try {
            await request("/clientes/me", "DELETE");
            localStorage.removeItem("petflow_customer_token");
            localStorage.removeItem("petflow_customer_user");
            window.location.href = "/";
        } catch (error) {
            setStatus(status, error.message || "Não foi possível excluir o cadastro.");
        }
    });
}

async function setupPublicOrders() {
    const list = document.getElementById("publicOrdersList");

    if (!list) {
        return;
    }

    const token = localStorage.getItem("petflow_customer_token");

    if (!token) {
        window.location.href = "/login";
        return;
    }

    const status = document.getElementById("ordersStatus");

    try {
        const payload = await request("/clientes/pedidos", "GET");
        renderOrders(list, Array.isArray(payload.data) ? payload.data : []);
        setStatus(status, "");
    } catch (error) {
        setStatus(status, error.message || "Não foi possível carregar seus pedidos.");
    }
}

function renderOrders(list, orders) {
    if (!orders.length) {
        list.innerHTML = `
            <div class="orders-empty">
                <i class="fa-regular fa-folder-open"></i>
                <strong>Você ainda não fez pedidos.</strong>
                <span>Quando comprar pela sacola, seus pedidos aparecerão aqui.</span>
            </div>
        `;
        return;
    }

    list.innerHTML = orders.map(order => {
        const items = Array.isArray(order.itens) ? order.itens : [];

        return `
            <article class="order-card">
                <header>
                    <div>
                        <span>Pedido #${escapeHtml(shortId(order.id))}</span>
                        <strong>${escapeHtml(formatStatus(order.status))}</strong>
                    </div>
                    <b>${currency(order.valor_final || order.valor_total)}</b>
                </header>
                <dl>
                    <div>
                        <dt>Data</dt>
                        <dd>${formatDate(order.created_at)}</dd>
                    </div>
                    <div>
                        <dt>Pagamento</dt>
                        <dd>${escapeHtml(order.forma_pagamento || "Não informado")}</dd>
                    </div>
                </dl>
                <ul>
                    ${items.map(item => `
                        <li>
                            <span>${escapeHtml(item.produto || "Produto")}</span>
                            <strong>${Number(item.quantidade || 0)} x ${currency(item.valor_unitario)}</strong>
                        </li>
                    `).join("")}
                </ul>
            </article>
        `;
    }).join("");
}

function formatStatus(status) {
    const labels = {
        PENDENTE: "Pendente",
        APROVADO: "Aprovado",
        EM_SEPARACAO: "Em separação",
        EM_ENTREGA: "Em entrega",
        CONCLUIDO: "Concluído",
        CANCELADO: "Cancelado"
    };

    Object.assign(labels, {
        AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
        PAGAMENTO_APROVADO: "Pagamento aprovado",
        EM_SEPARACAO: "Em separação",
        SAIU_PARA_ENTREGA: "Saiu para entrega",
        ENTREGUE: "Entregue",
        FINALIZADA: "Finalizado",
        CONCLUIDO: "Concluído"
    });

    return labels[status] || status || "Pendente";
}

function shortId(id) {
    return String(id || "").slice(0, 8).toUpperCase();
}

function formatDate(value) {
    if (!value) {
        return "Não informado";
    }

    return new Date(value).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function currency(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function setupCepLookup() {
    document.querySelectorAll("input[name='cep']").forEach(input => {
        input.addEventListener("blur", async () => {
            const cep = input.value.replace(/\D/g, "");

            if (cep.length !== 8) {
                return;
            }

            try {
                const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await response.json();

                if (data.erro) {
                    return;
                }

                const form = input.closest("form");
                setField(form, "endereco", data.logradouro);
                setField(form, "bairro", data.bairro);
                setField(form, "cidade", data.localidade);
                setField(form, "estado", data.uf);
                form?.elements.numero?.focus();
            } catch {
                // CEP manual continua permitido.
            }
        });
    });
}

function setupForgotPassword() {
    document.querySelector("[data-public-forgot-password]")?.addEventListener("click", async event => {
        event.preventDefault();
        const status = document.getElementById("loginStatus");
        const email = document.getElementById("loginEmail")?.value?.trim();

        if (!email) {
            setStatus(status, "Informe seu e-mail para receber o link de recuperação.");
            return;
        }

        setStatus(status, "Enviando e-mail de recuperação...");

        try {
            const payload = await request("/clientes/esqueci-senha", "POST", { email });
            setStatus(status, payload.message || "Verifique seu e-mail.");
        } catch (error) {
            setStatus(status, error.message || "Não foi possível enviar o e-mail.");
        }
    });
}

function setupPublicResetPassword() {
    const form = document.getElementById("publicResetPasswordForm");

    if (!form) {
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token") || "";
    const status = document.getElementById("resetStatus");
    const tokenInput = document.getElementById("resetToken");

    if (tokenInput) {
        tokenInput.value = token;
    }

    if (!token) {
        setStatus(status, "Link inválido. Solicite uma nova recuperação de senha.");
    }

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const senha = form.senha.value;
        const senhaConfirmacao = form.senhaConfirmacao.value;

        if (senha !== senhaConfirmacao) {
            setStatus(status, "As senhas não conferem.");
            return;
        }

        setStatus(status, "Salvando nova senha...");

        try {
            await request("/clientes/redefinir-senha", "POST", { token, senha });
            setStatus(status, "Senha redefinida com sucesso. Você já pode entrar.");
            setTimeout(() => {
                window.location.href = "/login";
            }, 1500);
        } catch (error) {
            setStatus(status, error.message || "Não foi possível redefinir a senha.");
        }
    });
}

async function request(endpoint, method = "GET", body) {
    const token = localStorage.getItem("petflow_customer_token");
    const response = await fetch(`${CUSTOMER_API}${endpoint}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(token ?{ Authorization: `Bearer ${token}` } : {})
        },
        ...(body ?{ body: JSON.stringify(body) } : {})
    });

    const payload = await response.json();

    if (!response.ok) {
        throw new Error(payload.message || `Erro ${response.status}`);
    }

    return payload;
}

function saveCustomer(data) {
    localStorage.setItem("petflow_customer_token", data.token);
    localStorage.setItem("petflow_customer_user", JSON.stringify(data.user));
}

function fillForm(form, data) {
    Object.entries(data || {}).forEach(([key, value]) => {
        if (form.elements[key]) {
            form.elements[key].value = value || "";
        }
    });
}

function setField(form, name, value) {
    if (form?.elements[name]) {
        form.elements[name].value = value || "";
    }
}

function setStatus(element, message) {
    if (element) {
        element.textContent = message || "";
    }
}

function escapeHtml(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
