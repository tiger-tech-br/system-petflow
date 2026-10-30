"use strict";
(() => {
    const VERSION = "2026-10-30", KEY = "petflow_privacy_notice";
    const FALLBACK = {
        controllerName: "Responsável da loja ainda não informado",
        controllerDocument: "Documento do responsável ainda não informado",
        controllerAddress: "Endereço do responsável ainda não informado",
        privacyEmail: "E-mail de privacidade ainda não informado",
        privacyContact: "Canal de privacidade ainda não configurado.",
        privacyResponsible: "Responsável pelo atendimento de privacidade ainda não informado",
        policyVersion: VERSION
    };
    function acknowledged(storage) {
        try { return JSON.parse(storage.getItem(KEY) || "null")?.version === VERSION; }
        catch { return false; }
    }
    function remember(storage) {
        try { storage.setItem(KEY, JSON.stringify({ version: VERSION, acknowledgedAt: new Date().toISOString() })); }
        catch { /* O aviso continua utilizável sem armazenamento disponível. */ }
    }
    function applyInformation(document, value) {
        const data = value && typeof value === "object" ? value : {};
        for (const node of document.querySelectorAll("[data-legal-field]")) {
            const key = node.dataset.legalField;
            if (!Object.hasOwn(FALLBACK, key)) continue;
            node.textContent = typeof data[key] === "string" && data[key].trim() ? data[key].slice(0, 400) : FALLBACK[key];
        }
        for (const notice of document.querySelectorAll("[data-legal-demo-notice]")) notice.hidden = data.configured === true;
        for (const link of document.querySelectorAll("[data-legal-email]")) {
            const email = data.privacyEmail;
            const valid = typeof email === "string" && /^[^\s@<>"?&#]+@[^\s@<>"?&#]+\.[^\s@<>"?&#]+$/.test(email);
            link.hidden = !valid;
            if (valid) link.setAttribute("href", "mailto:" + encodeURIComponent(email));
            else link.removeAttribute("href");
        }
    }
    function mount(document, window) {
        if (document.getElementById("petflowPrivacyNotice")) return;
        const style = document.createElement("link");
        style.rel = "stylesheet"; style.href = "/css/components/site-privacy.css?v=20261030-1";
        document.head.append(style);
        if (!document.querySelector('a[href="/privacidade"]')) {
            const shortcuts = document.createElement("nav");
            shortcuts.className = "pf-privacy-shortcuts";
            shortcuts.setAttribute("aria-label", "Privacidade e direitos");
            shortcuts.innerHTML = '<a href="/privacidade">Central de Privacidade</a><a href="/politica-de-cookies">Cookies e armazenamento</a><button type="button" data-privacy-preferences>Preferências de privacidade</button>';
            document.body.append(shortcuts);
        }
        const notice = document.createElement("section");
        notice.id = "petflowPrivacyNotice"; notice.className = "pf-privacy-notice";
        notice.setAttribute("aria-label", "Privacidade e armazenamento");
        notice.innerHTML = '<span class="pf-privacy-symbol" aria-hidden="true">◈</span><div><strong>Sua privacidade, com transparência.</strong><p>Usamos armazenamento necessário para acesso, sacola e preferências. Esta versão não inclui publicidade rastreada. <a href="/politica-de-cookies">Saiba como funciona</a>.</p><div class="pf-privacy-actions"><button type="button" data-privacy-dismiss>Entendi</button><button type="button" data-privacy-preferences>Ver preferências</button><a href="/privacidade">Seus direitos</a></div></div>';
        const dialog = document.createElement("dialog");
        dialog.id = "petflowPrivacyDialog"; dialog.className = "pf-privacy-dialog";
        dialog.setAttribute("aria-labelledby", "petflowPrivacyTitle");
        dialog.innerHTML = '<form method="dialog"><div class="pf-privacy-dialog-top"><span>PRIVACIDADE PETFLOW</span><button type="submit" aria-label="Fechar preferências">×</button></div><h2 id="petflowPrivacyTitle">Você entende o que fica salvo.</h2><p>As escolhas de publicidade por e-mail são separadas do cadastro e deste aviso.</p><div class="pf-privacy-setting"><div><strong>Armazenamento necessário</strong><p>Acesso à conta, segurança, sacola, favoritos e endereço informado na sessão. Este aviso fica salvo neste navegador, quando disponível.</p></div><span>Sempre necessário</span></div><div class="pf-privacy-setting"><div><strong>Estatísticas e publicidade opcional</strong><p>Não há pixels de publicidade ou medição de audiência instalados nesta versão. Nenhum consentimento para essas finalidades é concedido aqui.</p></div><span>Não utilizados</span></div><p>Mapas, consulta de CEP, recursos visuais e checkout podem envolver serviços externos. Veja os fornecedores e os direitos na <a href="/politica-de-privacidade">Política de Privacidade</a>.</p><p>Para cancelar a newsletter, use o link da mensagem ou o <a href="/atendimento.html">atendimento de privacidade</a>.</p><button class="pf-privacy-done" type="submit">Concluir</button></form>';
        document.body.append(notice, dialog);
        try { notice.hidden = acknowledged(window.localStorage); } catch { notice.hidden = false; }
        notice.querySelector("[data-privacy-dismiss]").addEventListener("click", () => {
            try { remember(window.localStorage); } catch { /* Armazenamento indisponível. */ }
            notice.hidden = true;
        });
        document.addEventListener("click", event => {
            const opener = event.target.closest?.("[data-privacy-preferences]");
            if (!opener) return;
            event.preventDefault();
            if (!dialog.open) {
                if (typeof dialog.showModal === "function") dialog.showModal();
                else dialog.setAttribute("open", "");
            }
        });
        dialog.querySelector("form").addEventListener("submit", event => {
            event.preventDefault();
            if (typeof dialog.close === "function") dialog.close();
            else dialog.removeAttribute("open");
            try { remember(window.localStorage); } catch { /* Armazenamento indisponível. */ }
            notice.hidden = true;
        });
        // Somente informações públicas permitidas pelo servidor, sem tokens ou dados de conta.
        window.fetch("/api/public/privacidade", { credentials: "omit", cache: "no-store" })
            .then(response => response.ok ? response.json() : null)
            .then(payload => applyInformation(document, payload?.data))
            .catch(() => applyInformation(document, null));
    }
    if (typeof module === "object" && module.exports) module.exports = { acknowledged, remember, applyInformation, VERSION, KEY };
    else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => mount(document, window), { once: true });
    else mount(document, window);
})();
