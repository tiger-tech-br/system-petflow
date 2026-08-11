"use strict";

const CATEGORY_API = window.location.hostname === "localhost"
    ? "http://localhost:4500/api/public"
    : "/api/public";

const CATEGORY_CONFIG = {
    caes: {
        title: "Produtos para cães",
        description: "Rações, petiscos, acessórios e cuidados selecionados para cachorros.",
        image: "/images/categories/dogs.jpg",
        keywords: ["cao", "caes", "cachorro", "canis", "bifinho", "coleira", "adultos"]
    },
    gatos: {
        title: "Produtos para gatos",
        description: "Itens escolhidos para gatos, com foco em alimentação, conforto e rotina.",
        image: "/images/categories/cats.jpg",
        keywords: ["gato", "gatos", "felis", "castrados"]
    },
    aves: {
        title: "Produtos para aves",
        description: "Alimentos, acessórios e cuidados para aves de estimação.",
        image: "/images/categories/birds.jpg",
        keywords: ["ave", "aves", "passaro", "passaros", "calopsita", "periquito"]
    },
    peixes: {
        title: "Produtos para peixes",
        description: "Itens para aquários, alimentação, limpeza e bem-estar dos peixes.",
        image: "/images/categories/fish.jpg",
        keywords: ["peixe", "peixes", "aquario", "aquarios"]
    },
    roedores: {
        title: "Produtos para roedores",
        description: "Produtos para hamster, porquinho-da-índia, coelhos e pequenos pets.",
        image: "/images/categories/rodents.jpg",
        keywords: ["roedor", "roedores", "hamster", "coelho", "porquinho"],
        fallbackCategories: ["Petiscos", "Acessórios", "Higiene"]
    },
    acessorios: {
        title: "Acessórios para pets",
        description: "Coleiras, brinquedos, camas, transporte e acessórios para a rotina do pet.",
        image: "/images/categories/accessories.jpg",
        keywords: ["acessorio", "acessorios", "coleira", "brinquedo", "cama", "mordedor"],
        fallbackCategories: ["Acessórios"]
    }
};

let allProducts = [];
let publicFavorites = new Set(JSON.parse(sessionStorage.getItem("petflow_public_favorites") || "[]"));
let currentSlug = "caes";

document.addEventListener("DOMContentLoaded", () => {
    setupPublicHeader();
    setupCategoryPage();
});

async function setupCategoryPage() {
    currentSlug = CATEGORY_CONFIG[getCurrentSlug()] ? getCurrentSlug() : "caes";
    renderCategoryHeader(CATEGORY_CONFIG[currentSlug]);
    setupToolbar();

    try {
        const response = await fetch(`${CATEGORY_API}/produtos`);
        const payload = await response.json();

        if (!response.ok) {
            throw new Error(payload.message || "Produtos indisponíveis.");
        }

        allProducts = Array.isArray(payload.data) ? payload.data : [];
        applyFilters();
    } catch (error) {
        renderEmpty(error.message || "Não foi possível carregar os produtos.");
    }
}

function setupToolbar() {
    const search = document.getElementById("categorySearch");
    const filter = document.getElementById("categoryFilter");
    const toolbar = document.getElementById("categoryToolbar");

    if (filter) {
        filter.value = currentSlug;
        filter.addEventListener("change", () => {
            currentSlug = filter.value;
            renderCategoryHeader(CATEGORY_CONFIG[currentSlug]);
            updateUrl(currentSlug);
            applyFilters();
        });
    }

    search?.addEventListener("input", applyFilters);
    toolbar?.addEventListener("submit", event => {
        event.preventDefault();
        applyFilters();
    });
}

function applyFilters() {
    const config = CATEGORY_CONFIG[currentSlug];
    const query = normalize(document.getElementById("categorySearch")?.value || "");
    const categoryProducts = filterByPetCategory(allProducts, config);
    const products = query ? filterBySearch(categoryProducts, query) : categoryProducts;

    renderProducts(products, config, query);
}

function renderCategoryHeader(config) {
    document.title = `PetFlow | ${config.title}`;
    setText("categoryTitle", config.title);
    setText("categoryDescription", config.description);

    const image = document.getElementById("categoryImage");

    if (image) {
        image.src = config.image;
        image.alt = config.title;
    }
}

function filterByPetCategory(products, config) {
    const matches = products.filter(product => {
        const haystack = productHaystack(product);
        return config.keywords.some(keyword => haystack.includes(keyword));
    });

    if (matches.length || !config.fallbackCategories?.length) {
        return matches;
    }

    const allowed = config.fallbackCategories.map(normalize);
    return products.filter(product => allowed.includes(normalize(product.categoria)));
}

function filterBySearch(products, query) {
    return products.filter(product => productHaystack(product).includes(query));
}

function productHaystack(product) {
    return normalize([
        product.nome,
        product.descricao,
        product.categoria,
        product.marca,
        product.fornecedor,
        product.sku
    ].filter(Boolean).join(" "));
}

function renderProducts(products, config, query = "") {
    const grid = document.getElementById("categoryProducts");

    if (!grid) {
        return;
    }

    if (!products.length) {
        const message = query
            ? `Nenhum produto encontrado para "${query}" em ${config.title.toLowerCase()}.`
            : `Ainda não há produtos cadastrados para ${config.title.toLowerCase()}.`;

        renderEmpty(message);
        return;
    }

    grid.innerHTML = products.map(product => {
        const id = String(product.id || product.sku || product.nome);
        const href = `/produtos/${productSlug(product)}`;
        const inCart = Boolean(readCart()[id]);
        const favorite = publicFavorites.has(id);

        return `
            <article class="product-card" data-product-id="${escapeHtml(id)}">
                <a class="product-link" href="${escapeHtml(href)}" aria-label="Ver produto ${escapeHtml(product.nome)}">
                    <img src="${escapeHtml(product.foto || "/images/products/petflow-prime-racao.jpg")}" alt="${escapeHtml(product.nome)}" loading="lazy" decoding="async">
                </a>
                <div class="product-content">
                    <span class="product-category">${escapeHtml(product.categoria || "PetFlow")}</span>
                    <h3 class="product-title"><a href="${escapeHtml(href)}">${escapeHtml(product.nome)}</a></h3>
                    <p class="product-description">${escapeHtml(product.descricao || "Produto selecionado para o seu pet.")}</p>
                    <div class="product-footer">
                        <strong class="product-price">${currency(product.preco)}</strong>
                        <div class="product-actions">
                            <button class="cart-action ${inCart ? "is-active" : ""}" type="button" data-add-cart="${escapeHtml(id)}">
                                <i class="fa-solid ${inCart ? "fa-check" : "fa-plus"}"></i>
                                <span>${inCart ? "Na sacola" : "Adicionar à sacola"}</span>
                            </button>
                            <button class="cart-action favorite ${favorite ? "is-active" : ""}" type="button" data-favorite-product="${escapeHtml(id)}" aria-label="Favoritar ${escapeHtml(product.nome)}">
                                <i class="fa-${favorite ? "solid" : "regular"} fa-heart"></i>
                                <span>${favorite ? "Favorito" : "Favoritar"}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </article>
        `;
    }).join("");

    bindCartButtons();
}

function renderEmpty(message) {
    const grid = document.getElementById("categoryProducts");

    if (!grid) {
        return;
    }

    grid.innerHTML = `
        <div class="empty-card">
            <i class="fa-regular fa-folder-open"></i>
            <strong>Categoria em atualização</strong>
            <p>${escapeHtml(message)} Enquanto isso, veja os destaques da loja ou fale com a equipe PetFlow.</p>
        </div>
    `;
}

function bindCartButtons() {
    document.querySelectorAll("[data-add-cart]").forEach(button => {
        button.addEventListener("click", () => {
            const id = button.dataset.addCart;
            const cart = readCart();

            cart[id] = 1;
            sessionStorage.setItem("petflow_public_cart", JSON.stringify(cart));

            button.classList.add("is-active");
            button.innerHTML = `<i class="fa-solid fa-check"></i><span>Na sacola</span>`;
            updateHeaderCounters();
        });
    });

    document.querySelectorAll("[data-favorite-product]").forEach(button => {
        button.addEventListener("click", () => {
            const id = button.dataset.favoriteProduct;

            if (publicFavorites.has(id)) {
                publicFavorites.delete(id);
            } else {
                publicFavorites.add(id);
            }

            sessionStorage.setItem("petflow_public_favorites", JSON.stringify([...publicFavorites]));
            updateHeaderCounters();
            applyFilters();
        });
    });
}

function setupPublicHeader() {
    setupHeaderSearch();
    setupMenuToggle();
    setupCustomerHeader();
    updateHeaderCounters();
}

function setupHeaderSearch() {
    const form = document.getElementById("publicHeaderSearch");
    const input = document.getElementById("search");

    input?.addEventListener("input", () => {
        const categorySearch = document.getElementById("categorySearch");

        if (categorySearch) {
            categorySearch.value = input.value;
            applyFilters();
        }
    });

    form?.addEventListener("submit", event => {
        event.preventDefault();

        const categorySearch = document.getElementById("categorySearch");

        if (categorySearch) {
            categorySearch.value = input?.value || "";
            applyFilters();
        }
    });
}

function setupMenuToggle() {
    const button = document.querySelector(".menu-toggle");
    const menu = document.getElementById("menu");

    button?.addEventListener("click", () => {
        const willOpen = !menu?.classList.contains("active");

        menu?.classList.toggle("active", willOpen);
        button.setAttribute("aria-expanded", String(willOpen));
        button.setAttribute("aria-label", willOpen ? "Fechar menu" : "Abrir menu");
    });
}

function setupCustomerHeader() {
    const token = getCustomerToken();
    const cached = readCustomerCache();
    const firstName = getFirstName(cached?.nome);
    const fullName = String(cached?.nome || "Cliente").trim();
    const notificationButton = document.querySelector(".customer-notification-button");

    if (notificationButton) {
        notificationButton.hidden = !token;
    }

    document.querySelectorAll("[data-public-logout]").forEach(link => link.remove());

    document.querySelectorAll("a[href='/login'], a[href='/conta'], .menu-login-link").forEach(link => {
        if (token) {
            link.href = "/conta";
            link.textContent = firstName;
            link.title = fullName;
            link.classList.add("is-authenticated");
            link.setAttribute("aria-label", "Abrir minha conta");
            insertLogoutLink(link);
            return;
        }

        link.href = "/login";
        link.textContent = "Entrar";
        link.removeAttribute("title");
        link.classList.remove("is-authenticated");
        link.setAttribute("aria-label", "Entrar na conta");
    });
}

function insertLogoutLink(accountLink) {
    const logout = document.createElement("a");
    logout.href = "#";
    logout.className = accountLink.classList.contains("menu-login-link")
        ? "menu-link public-logout-link"
        : "btn btn-secondary public-logout-link";
    logout.dataset.publicLogout = "true";
    logout.textContent = "Sair";
    logout.setAttribute("aria-label", "Sair da conta");
    logout.addEventListener("click", handleCustomerLogout);
    accountLink.insertAdjacentElement("afterend", logout);
}

function handleCustomerLogout(event) {
    event.preventDefault();
    clearCustomerSession();
    setupCustomerHeader();
    updateHeaderCounters();
    applyFilters();
}

function clearCustomerSession() {
    sessionStorage.removeItem("petflow_customer_token");
    sessionStorage.removeItem("petflow_customer_user");
    sessionStorage.removeItem("petflow_public_favorites");
    sessionStorage.removeItem("petflow_public_cart");
    localStorage.removeItem("petflow_customer_token");
    localStorage.removeItem("petflow_customer_user");
    localStorage.removeItem("petflow_public_favorites");
    localStorage.removeItem("petflow_public_cart");
    publicFavorites = new Set();
}

function updateHeaderCounters() {
    const cartCount = Object.values(readCart()).reduce((sum, quantity) => sum + Number(quantity || 0), 0);

    document.querySelectorAll("[aria-label='Sacola'], .menu-action-link[aria-label='Abrir sacola']").forEach(link => {
        link.dataset.count = String(cartCount);
        link.classList.toggle("has-count", cartCount > 0);
    });

    document.querySelectorAll("[aria-label='Favoritos'], .menu-action-link[aria-label='Abrir favoritos']").forEach(link => {
        link.dataset.count = String(publicFavorites.size);
        link.classList.toggle("has-count", publicFavorites.size > 0);
    });
}

function getCustomerToken() {
    return sessionStorage.getItem("petflow_customer_token");
}

function readCustomerCache() {
    try {
        return JSON.parse(sessionStorage.getItem("petflow_customer_user") || "null");
    } catch {
        return null;
    }
}

function getFirstName(name) {
    const firstName = String(name || "Cliente").trim().split(/\s+/)[0] || "Cliente";
    return firstName.length > 12 ? `${firstName.slice(0, 11)}...` : firstName;
}

function productSlug(product) {
    return slugify(product.sku || product.nome || product.id);
}

function updateUrl(slug) {
    const nextPath = `/categorias/${slug}`;

    if (window.location.pathname !== nextPath) {
        window.history.pushState({}, "", nextPath);
    }
}

function readCart() {
    try {
        return JSON.parse(sessionStorage.getItem("petflow_public_cart") || "{}") || {};
    } catch {
        return {};
    }
}

function getCurrentSlug() {
    return window.location.pathname.split("/").filter(Boolean).pop() || "caes";
}

function slugify(value) {
    return normalize(value)
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

function normalize(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function currency(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
