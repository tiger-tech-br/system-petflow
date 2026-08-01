"use strict";

document.addEventListener("DOMContentLoaded", () => {
    loadPublicCatalog();
    loadPublicServices();
    setupPublicSearch();
    setupCartCheckout();
    setupCustomerHeader();
});

const PUBLIC_API = window.location.hostname === "localhost"
    ?"http://localhost:4500/api/public"
    : "/api/public";

let publicProducts = [];
let publicCart = normalizeCartStorage();
let publicFavorites = new Set(JSON.parse(localStorage.getItem("petflow_public_favorites") || "[]"));
let publicCustomer = null;

async function loadPublicCatalog() {
    const grid = document.querySelector(".products-grid");

    if (!grid) {
        return;
    }

    try {
        const response = await fetch(`${PUBLIC_API}/produtos`);

        if (!response.ok) {
            throw new Error("Catálogo indisponível");
        }

        const payload = await response.json();
        publicProducts = Array.isArray(payload.data) ? payload.data : [];

        if (publicProducts.length) {
            renderProducts(publicProducts.slice(0, 6));
            updateHeaderCounters();
        }
    } catch {
        publicProducts = [...document.querySelectorAll(".product-card")].map(card => ({
            id: card.querySelector(".product-title")?.textContent.trim(),
            nome: card.querySelector(".product-title")?.textContent.trim(),
            descricao: card.querySelector(".product-description")?.textContent.trim(),
            categoria: card.querySelector(".product-category")?.textContent.trim(),
            preco: card.querySelector(".product-price")?.textContent.replace(/[^\d,]/g, "").replace(",", "."),
            foto: card.querySelector(".product-image")?.getAttribute("src")
        })).filter(item => item.nome);

        bindProductActions();
        updateHeaderCounters();
    }
}

async function loadPublicServices() {
    const grid = document.querySelector(".services-grid");

    if (!grid) {
        return;
    }

    try {
        const response = await fetch(`${PUBLIC_API}/servicos`);

        if (!response.ok) {
            throw new Error("Serviços indisponíveis");
        }

        const payload = await response.json();
        const services = Array.isArray(payload.data) ?payload.data : [];

        if (services.length) {
            renderServices(services.slice(0, 6));
        }
    } catch {
        // Mantem os cards estaticos como fallback.
    }
}

function renderServices(services) {
    const grid = document.querySelector(".services-grid");

    if (!grid) {
        return;
    }

    grid.innerHTML = services.map(service => {
        const image = serviceImage(service.nome);

        return `
            <article class="service-card">
                <img src="${escapeHtml(image)}" alt="${escapeHtml(service.nome)}" loading="lazy" decoding="async">
                <h3>${escapeHtml(service.nome)}</h3>
                <p>${escapeHtml(service.descricao || "Atendimento profissional para cuidar do bem-estar do seu pet.")}</p>
                <div class="service-meta">
                    <strong>${currency(service.preco)}</strong>
                    <span>${Number(service.duracao || 0) || 30} min</span>
                </div>
            </article>
        `;
    }).join("");
}

function serviceImage(name) {
    const normalized = normalize(name);

    if (normalized.includes("tosa")) return "/images/services/tosa.jpg";
    if (normalized.includes("consulta") || normalized.includes("veterin")) return "/images/services/veterinario.jpg";
    if (normalized.includes("vacina")) return "/images/services/vacinacao.jpg";
    if (normalized.includes("hotel")) return "/images/services/hotelzinho.jpg";
    if (normalized.includes("delivery")) return "/images/services/delivery.jpg";

    return "/images/services/banho-tosa.jpg";
}

function setupPublicSearch() {
    const form = document.querySelector(".search-form");
    const input = document.getElementById("search");

    if (!form || !input) {
        return;
    }

    form.addEventListener("submit", event => {
        event.preventDefault();
        filterProducts(input.value);
        document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
    });

    input.addEventListener("input", () => {
        if (!input.value.trim()) {
            renderProducts(publicProducts.slice(0, 6));
        }
    });
}

function filterProducts(term) {
    const normalized = normalize(term);
    const matches = publicProducts.filter(product => {
        return [
            product.nome,
            product.descricao,
            product.categoria,
            product.sku
        ].some(value => normalize(value).includes(normalized));
    });

    renderProducts(matches.length ?matches : publicProducts.slice(0, 6), {
        emptyMessage: matches.length ?"" : "Nenhum produto encontrado para essa busca."
    });
}

function renderProducts(products, options = {}) {
    const grid = document.querySelector(".products-grid");

    if (!grid) {
        return;
    }

    if (!products.length) {
        grid.innerHTML = `<div class="public-empty">${options.emptyMessage || "Nenhum produto disponível no momento."}</div>`;
        return;
    }

    grid.innerHTML = products.map(product => {
        const id = product.id || product.sku || product.nome;
        const inCart = Boolean(publicCart[String(id)]);
        const favorite = publicFavorites.has(String(id));

        return `
            <article class="product-card" data-product-card data-id="${escapeHtml(id)}">
                <img class="product-image" src="${escapeHtml(product.foto || "/images/products/petflow-prime-racao.jpg")}" alt="${escapeHtml(product.nome)}" loading="lazy" decoding="async">
                <div class="product-content">
                    <span class="product-category">${escapeHtml(product.categoria || "PetFlow")}</span>
                    <h3 class="product-title">${escapeHtml(product.nome)}</h3>
                    <p class="product-description">${escapeHtml(product.descricao || "Produto selecionado para cuidar melhor do seu pet.")}</p>
                    <div class="product-footer">
                        <strong class="product-price">${currency(product.preco)}</strong>
                        <div class="cart-actions" aria-label="Ações da sacola">
                            <button class="cart-action add ${inCart ?"is-active" : ""}" type="button" data-action="toggle-cart">
                                <i class="fa-solid ${inCart ?"fa-check" : "fa-plus"}"></i>
                                <span>${inCart ?"Na sacola" : "Adicionar à sacola"}</span>
                            </button>
                            <button class="cart-action remove ${favorite ?"is-active" : ""}" type="button" data-action="toggle-favorite">
                                <i class="fa-${favorite ?"solid" : "regular"} fa-heart"></i>
                                <span>${favorite ?"Favorito" : "Favoritar"}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </article>
        `;
    }).join("");

    if (options.emptyMessage) {
        grid.insertAdjacentHTML("afterbegin", `<div class="public-empty">${escapeHtml(options.emptyMessage)}</div>`);
    }

    bindProductActions();
}

function bindProductActions() {
    document.querySelectorAll("[data-action='toggle-cart']").forEach(button => {
        button.addEventListener("click", () => {
            const id = button.closest("[data-product-card]")?.dataset.id;

            if (!id) {
                return;
            }

            toggleCartProduct(id);
            persistPublicState();
            renderProducts(currentVisibleProducts());
        });
    });

    document.querySelectorAll("[data-action='toggle-favorite']").forEach(button => {
        button.addEventListener("click", () => {
            const id = button.closest("[data-product-card]")?.dataset.id;

            if (!id) {
                return;
            }

            toggleSet(publicFavorites, id);
            persistPublicState();
            renderProducts(currentVisibleProducts());
        });
    });
}

function currentVisibleProducts() {
    const visibleIds = [...document.querySelectorAll("[data-product-card]")].map(card => card.dataset.id);
    const products = publicProducts.filter(product => visibleIds.includes(String(product.id || product.sku || product.nome)));

    return products.length ?products : publicProducts.slice(0, 6);
}

function toggleSet(set, value) {
    if (set.has(String(value))) {
        set.delete(String(value));
        return;
    }

    set.add(String(value));
}

function toggleCartProduct(id) {
    const key = String(id);

    if (publicCart[key]) {
        delete publicCart[key];
        return;
    }

    publicCart[key] = 1;
}

function persistPublicState() {
    localStorage.setItem("petflow_public_cart", JSON.stringify(publicCart));
    localStorage.setItem("petflow_public_favorites", JSON.stringify([...publicFavorites]));
    updateHeaderCounters();
}

function updateHeaderCounters() {
    const cartCount = Object.values(publicCart).reduce((sum, quantity) => sum + Number(quantity || 0), 0);

    document.querySelectorAll("[aria-label='Sacola']").forEach(link => {
        link.dataset.count = String(cartCount);
        link.classList.toggle("has-count", cartCount > 0);
    });

    document.querySelectorAll("[aria-label='Favoritos']").forEach(link => {
        link.dataset.count = String(publicFavorites.size);
        link.classList.toggle("has-count", publicFavorites.size > 0);
    });
}

function setupCartCheckout() {
    injectCheckoutModal();

    document.querySelectorAll("[aria-label='Sacola'], .menu-action-link[aria-label='Abrir sacola']").forEach(link => {
        link.addEventListener("click", event => {
            event.preventDefault();
            openCheckoutModal();
        });
    });

    document.addEventListener("click", event => {
        if (event.target.closest("[data-cart-close]")) {
            closeCheckoutModal();
        }

        if (event.target.classList.contains("checkout-overlay")) {
            closeCheckoutModal();
        }

        const remove = event.target.closest("[data-cart-remove]");
        if (remove) {
            delete publicCart[remove.dataset.cartRemove];
            persistPublicState();
            renderCheckoutItems();
            renderProducts(currentVisibleProducts());
        }
    });

    document.addEventListener("input", event => {
        const quantity = event.target.closest("[data-cart-quantity]");

        if (!quantity) {
            return;
        }

        publicCart[quantity.dataset.cartQuantity] = Math.max(1, Number(quantity.value || 1));
        persistPublicState();
        renderCheckoutItems();
    });

    document.addEventListener("submit", event => {
        if (event.target?.id === "checkoutForm") {
            submitPublicOrder(event);
        }
    });
}

function injectCheckoutModal() {
    if (document.querySelector(".checkout-overlay")) {
        return;
    }

    document.body.insertAdjacentHTML("beforeend", `
        <div class="checkout-overlay" hidden>
            <aside class="checkout-panel" role="dialog" aria-modal="true" aria-labelledby="checkoutTitle">
                <header class="checkout-header">
                    <div>
                        <span>Sacola PetFlow</span>
                        <h2 id="checkoutTitle">Finalizar pedido</h2>
                    </div>
                    <button class="icon-badge" type="button" data-cart-close aria-label="Fechar sacola">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </header>
                <div class="checkout-items" id="checkoutItems"></div>
                <form class="checkout-form" id="checkoutForm">
                    <div class="checkout-customer" id="checkoutCustomer"></div>
                    <label>Observacoes<textarea class="form-control" name="observacoes" placeholder="Ex: entregar a tarde"></textarea></label>
                    <div class="checkout-total">
                        <span>Total</span>
                        <strong id="checkoutTotal">R$ 0,00</strong>
                    </div>
                    <button class="btn btn-primary" type="submit">Enviar pedido</button>
                    <p class="checkout-status" id="checkoutStatus" role="status"></p>
                </form>
            </aside>
        </div>
    `);
}
function openCheckoutModal() {
    const overlay = document.querySelector(".checkout-overlay");

    if (!overlay) {
        return;
    }

    renderCheckoutItems();
    renderCheckoutCustomer();
    overlay.hidden = false;
    document.body.classList.add("checkout-open");
}

function closeCheckoutModal() {
    const overlay = document.querySelector(".checkout-overlay");

    if (overlay) {
        overlay.hidden = true;
    }

    document.body.classList.remove("checkout-open");
}

function renderCheckoutItems() {
    const list = document.getElementById("checkoutItems");
    const total = document.getElementById("checkoutTotal");

    if (!list || !total) {
        return;
    }

    const items = getCartProducts();

    if (!items.length) {
        list.innerHTML = `<div class="public-empty">Sua sacola está vazia.</div>`;
        total.textContent = currency(0);
        return;
    }

    list.innerHTML = items.map(({ product, quantity }) => `
        <article class="checkout-item">
            <img src="${escapeHtml(product.foto || "/images/products/petflow-prime-racao.jpg")}" alt="${escapeHtml(product.nome)}">
            <div>
                <strong>${escapeHtml(product.nome)}</strong>
                <span>${currency(product.preco)}</span>
            </div>
            <input class="form-control" type="number" min="1" step="1" value="${quantity}" data-cart-quantity="${escapeHtml(product.id)}" aria-label="Quantidade">
            <button class="icon-badge" type="button" data-cart-remove="${escapeHtml(product.id)}" aria-label="Remover item">
                <i class="fa-solid fa-trash"></i>
            </button>
        </article>
    `).join("");

    total.textContent = currency(items.reduce((sum, item) => sum + Number(item.product.preco || 0) * item.quantity, 0));
}

function getCartProducts() {
    return Object.entries(publicCart)
        .map(([id, quantity]) => {
            const product = publicProducts.find(item => String(item.id || item.sku || item.nome) === String(id));

            return product
                ?{ product, quantity: Math.max(1, Number(quantity || 1)) }
                : null;
        })
        .filter(Boolean);
}

async function submitPublicOrder(event) {
    event.preventDefault();

    const status = document.getElementById("checkoutStatus");
    const form = event.target;
    const items = getCartProducts();
    const token = getCustomerToken();

    if (!items.length) {
        if (status) status.textContent = "Adicione produtos antes de finalizar.";
        return;
    }

    if (!token) {
        if (status) status.textContent = "Entre na sua conta para finalizar o pedido.";
        renderCheckoutCustomer();
        return;
    }

    if (!publicCustomer || !hasDeliveryAddress(publicCustomer)) {
        if (status) status.textContent = "Atualize seu endereço antes de finalizar.";
        renderCheckoutCustomer();
        return;
    }

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    if (status) status.textContent = "Enviando pedido...";

    try {
        const response = await fetch(`${PUBLIC_API}/pedidos`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                formaPagamento: "PIX",
                observacoes: data.observacoes,
                itens: items.map(({ product, quantity }) => ({
                    produto_id: product.id,
                    quantidade: quantity,
                    valor_unitario: Number(product.preco || 0)
                }))
            })
        });

        const payload = await response.json();

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem("petflow_customer_token");
                localStorage.removeItem("petflow_customer_user");
                setupCustomerHeader();
            }

            throw new Error(payload.message || "Não foi possível enviar o pedido.");
        }

        publicCart = {};
        persistPublicState();
        renderProducts(currentVisibleProducts());
        renderCheckoutItems();
        form.reset();

        if (status) {
            status.textContent = "Pedido enviado com sucesso. A PetFlow vai acompanhar pelo painel.";
        }
    } catch (error) {
        if (status) {
            status.textContent = error.message || "Não foi possível enviar o pedido.";
        }
    }
}

function setupCustomerHeader() {
    const token = getCustomerToken();
    const cached = readCustomerCache();
    const label = token ?"Minha conta" : "Entrar";
    const href = token ?"/conta" : "/login";

    document.querySelectorAll("a[href='/login'], .menu-login-link").forEach(link => {
        link.href = href;
        link.textContent = label;
        link.setAttribute("aria-label", token ?"Abrir minha conta" : "Entrar na conta");
    });

    if (token && cached?.nome) {
        document.querySelectorAll(".menu-login-link").forEach(link => {
            link.textContent = "Minha conta";
        });
    }
}

async function renderCheckoutCustomer() {
    const container = document.getElementById("checkoutCustomer");
    const submit = document.querySelector("#checkoutForm button[type='submit']");

    if (!container || !submit) {
        return;
    }

    const token = getCustomerToken();

    if (!token) {
        submit.disabled = true;
        container.innerHTML = `
            <div class="checkout-account-card is-warning">
                <strong>Entre para finalizar</strong>
                <p>Crie sua conta ou entre para usar seu endereço salvo na PetFlow.</p>
                <div class="checkout-account-actions">
                    <a class="btn btn-primary" href="/login">Entrar ou cadastrar</a>
                </div>
            </div>
        `;
        return;
    }

    try {
        publicCustomer = await fetchCustomerProfile();
        const addressComplete = hasDeliveryAddress(publicCustomer);

        submit.disabled = !addressComplete;
        const contact = [publicCustomer.telefone, publicCustomer.email].filter(Boolean).join(" - ");
        container.innerHTML = `
            <div class="checkout-account-card ${addressComplete ? "" : "is-warning"}">
                <div>
                    <span>Cliente</span>
                    <strong>${escapeHtml(publicCustomer.nome || "Cliente PetFlow")}</strong>
                    <p>${escapeHtml(contact)}</p>
                </div>
                <div>
                    <span>Endereço de entrega</span>
                    <strong>${escapeHtml(formatCustomerAddress(publicCustomer) || "Endereço incompleto")}</strong>
                    <p>${addressComplete ? "Esse endereço será usado no pedido." : "Atualize seu endereço antes de finalizar."}</p>
                </div>
                <div class="checkout-account-actions">
                    <a class="btn btn-secondary" href="/conta">Editar meus dados</a>
                </div>
            </div>
        `;
    } catch {
        localStorage.removeItem("petflow_customer_token");
        localStorage.removeItem("petflow_customer_user");
        submit.disabled = true;
        container.innerHTML = `
            <div class="checkout-account-card is-warning">
                <strong>Sessão expirada</strong>
                <p>Entre novamente para finalizar seu pedido.</p>
                <div class="checkout-account-actions">
                    <a class="btn btn-primary" href="/login">Entrar novamente</a>
                </div>
            </div>
        `;
        setupCustomerHeader();
    }
}

async function fetchCustomerProfile() {
    const response = await fetch(`${PUBLIC_API}/clientes/me`, {
        headers: {
            Authorization: `Bearer ${getCustomerToken()}`
        }
    });
    const payload = await response.json();

    if (!response.ok) {
        throw new Error(payload.message || "Cliente não autenticado.");
    }

    localStorage.setItem("petflow_customer_user", JSON.stringify(payload.data));
    return payload.data;
}

function getCustomerToken() {
    return localStorage.getItem("petflow_customer_token");
}

function readCustomerCache() {
    try {
        return JSON.parse(localStorage.getItem("petflow_customer_user") || "null");
    } catch {
        return null;
    }
}

function hasDeliveryAddress(customer) {
    return Boolean(customer?.endereco && customer?.numero && customer?.bairro && customer?.cidade && customer?.estado);
}

function formatCustomerAddress(customer) {
    return [
        customer?.endereco,
        customer?.numero,
        customer?.complemento,
        customer?.bairro,
        customer?.cidade,
        customer?.estado
    ].filter(Boolean).join(", ");
}
function normalizeCartStorage() {
    try {
        const stored = JSON.parse(localStorage.getItem("petflow_public_cart") || "{}");

        if (Array.isArray(stored)) {
            return Object.fromEntries(stored.map(id => [String(id), 1]));
        }

        return stored && typeof stored === "object" ?stored : {};
    } catch {
        return {};
    }
}

function currency(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function normalize(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function escapeHtml(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
