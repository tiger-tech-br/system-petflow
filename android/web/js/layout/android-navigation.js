"use strict";

(() => {
    if (window.parent !== window || /^(?:\/admin(?:\/|$)|\/login\/?$|\/cadastro\/?$|\/redefinir-senha\/?$)/.test(window.location.pathname)) return;
    if (window.PetFlowAndroidNavigation) {
        window.PetFlowAndroidNavigation.update();
        return;
    }

    const icons = {
        home: ["M3 10.5 12 3l9 7.5", "M5 9v11h5v-6h4v6h5V9"],
        categories: ["M3 3h7v7H3z", "M14 3h7v7h-7z", "M3 14h7v7H3z", "M14 14h7v7h-7z"],
        orders: ["M5 7h14l1 14H4L5 7Z", "M9 8V6a3 3 0 0 1 6 0v2"],
        account: ["M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z", "M4 21v-2a8 8 0 0 1 16 0v2"]
    };
    const items = [
        { key: "home", href: "/#hero", label: "Início" },
        { key: "categories", href: "/#categories", label: "Categorias" },
        { key: "orders", href: "/meus-pedidos", label: "Pedidos" },
        { key: "account", href: "/conta", label: "Conta" }
    ];
    let nav;
    let accountLink;
    let accountVisual;
    let accountLabel;
    let initialized = false;
    let measureQueued = false;

    function svgIcon(key) {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("width", "24");
        svg.setAttribute("height", "24");
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", "currentColor");
        svg.setAttribute("stroke-width", "1.8");
        svg.setAttribute("stroke-linecap", "round");
        svg.setAttribute("stroke-linejoin", "round");
        svg.setAttribute("aria-hidden", "true");
        for (const data of icons[key]) {
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", data);
            svg.append(path);
        }
        return svg;
    }

    function readCustomer() {
        let token = null;
        let cached = null;
        try { token = sessionStorage.getItem("petflow_customer_token"); } catch { /* Guest controls remain usable. */ }
        try { cached = JSON.parse(sessionStorage.getItem("petflow_customer_user") || "null"); } catch { /* A broken name cache never removes access to the account. */ }
        const name = typeof cached?.nome === "string" ? cached.nome.trim().replace(/\s+/g, " ").slice(0, 120) : "";
        return { authenticated: Boolean(token), name };
    }

    function activeKey() {
        const path = window.location.pathname.replace(/\/$/, "") || "/";
        if (path.startsWith("/categorias")) return "categories";
        if (path.startsWith("/meus-pedidos")) return "orders";
        if (path === "/conta" || path === "/meus-pets") return "account";
        if (path === "/") return window.location.hash.startsWith("#categories") ? "categories" : "home";
        if (path.startsWith("/produtos")) return "home";
        return "";
    }

    function reserveSpace() {
        if (!nav || measureQueued) return;
        measureQueued = true;
        window.requestAnimationFrame(() => {
            measureQueued = false;
            if (!nav.isConnected) return;
            const height = Math.ceil(nav.getBoundingClientRect().height);
            if (height > 0) document.body.style.setProperty("--pf-app-nav-height", `${height}px`);
        });
    }

    function update() {
        if (!initialized) {
            if (document.readyState !== "loading") init();
            return;
        }
        const customer = readCustomer();
        const firstName = customer.name.split(" ")[0];
        const displayName = customer.authenticated && firstName ? firstName : "Conta";
        accountLabel.textContent = displayName;
        accountLink.href = customer.authenticated ? "/conta" : "/login";
        accountLink.title = customer.authenticated && customer.name ? customer.name : "Minha conta";
        accountLink.setAttribute("aria-label", customer.authenticated ? `Minha conta${customer.name ? ": " + customer.name : ""}` : "Entrar na minha conta");
        accountVisual.replaceChildren();
        if (customer.authenticated && firstName) {
            const initial = document.createElement("span");
            initial.className = "pf-app-avatar";
            initial.textContent = Array.from(firstName)[0].toLocaleUpperCase("pt-BR");
            initial.setAttribute("aria-hidden", "true");
            accountVisual.append(initial);
        } else {
            const avatar = document.createElement("span");
            avatar.className = "pf-app-avatar pf-app-avatar-icon";
            avatar.append(svgIcon("account"));
            accountVisual.append(avatar);
        }
        const active = activeKey();
        for (const link of nav.querySelectorAll("[data-pf-app-nav]")) {
            const current = link.dataset.pfAppNav === active;
            link.classList.toggle("is-active", current);
            if (current) link.setAttribute("aria-current", active === "categories" && window.location.pathname === "/" ? "location" : "page");
            else link.removeAttribute("aria-current");
        }
        reserveSpace();
    }

    function init() {
        if (initialized || !document.body || document.body.classList.contains("customer-access")) return;
        initialized = true;
        const baseBottom = parseFloat(window.getComputedStyle(document.body).paddingBottom) || 0;
        document.body.style.setProperty("--pf-app-page-bottom", `${baseBottom}px`);
        document.body.classList.add("petflow-android-shell");
        nav = document.querySelector(".store-mobile-nav") || document.createElement("nav");
        nav.classList.add("store-mobile-nav", "pf-app-bottom-nav");
        nav.setAttribute("aria-label", "Navegação do aplicativo");
        const links = items.map(item => {
            const link = document.createElement("a");
            link.href = item.href;
            link.dataset.pfAppNav = item.key;
            const visual = document.createElement("span");
            visual.className = "pf-app-nav-visual";
            visual.append(svgIcon(item.key));
            const label = document.createElement("span");
            label.className = "pf-app-nav-label";
            label.textContent = item.label;
            link.append(visual, label);
            if (item.key === "account") {
                accountLink = link;
                accountVisual = visual;
                accountLabel = label;
            }
            return link;
        });
        // Replacing the old children also removes the misplaced fifth "Sair" item.
        nav.replaceChildren(...links);
        document.body.append(nav);
        if (typeof ResizeObserver === "function") new ResizeObserver(reserveSpace).observe(nav);
        window.addEventListener("resize", reserveSpace, { passive: true });
        window.addEventListener("pageshow", update);
        window.addEventListener("hashchange", update);
        window.addEventListener("petflow:cart-updated", update);
        document.addEventListener("petflow:customer-logout", update);
        update();
    }

    window.PetFlowAndroidNavigation = { update };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
    else init();
})();
