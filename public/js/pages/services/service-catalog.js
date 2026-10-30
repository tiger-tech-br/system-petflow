"use strict";

(() => {
    const grid = document.getElementById("servicesCatalogGrid");
    const status = document.getElementById("servicesCatalogStatus");
    const retry = document.getElementById("servicesCatalogRetry");
    if (!grid || !status || !retry) return;

    retry.addEventListener("click", loadServices);
    loadServices();

    async function loadServices() {
        retry.hidden = true;
        grid.setAttribute("aria-busy", "true");
        status.textContent = "Carregando serviços disponíveis...";
        try {
            const response = await fetch("/api/public/servicos");
            if (!response.ok) throw new Error("Serviços indisponíveis");
            const payload = await response.json();
            const services = Array.isArray(payload.data) ? payload.data : [];
            grid.replaceChildren(...services.map(buildServiceCard));
            status.textContent = services.length === 1 ? "1 serviço disponível." : services.length ? `${services.length} serviços disponíveis.` : "Nenhum serviço disponível no momento. Consulte esta página novamente mais tarde.";
        } catch {
            grid.replaceChildren();
            status.textContent = "Não foi possível carregar os serviços. Tente novamente em instantes.";
            retry.hidden = false;
        } finally {
            grid.setAttribute("aria-busy", "false");
        }
    }

    function buildServiceCard(service) {
        const article = document.createElement("article");
        article.className = "services-catalog-card";
        const link = document.createElement("a");
        const slug = normalize(service.nome).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        link.href = `/servicos/${slug}`;
        const image = document.createElement("img");
        image.src = serviceImage(service.nome);
        image.alt = String(service.nome || "Serviço PetFlow");
        image.loading = "lazy";
        image.decoding = "async";
        image.width = 560;
        image.height = 360;
        const copy = document.createElement("div");
        copy.className = "services-catalog-card-copy";
        const heading = document.createElement("h3");
        heading.textContent = service.nome || "Serviço PetFlow";
        const description = document.createElement("p");
        description.textContent = service.descricao || "Conheça os detalhes deste atendimento e solicite um horário para o seu pet.";
        const footer = document.createElement("div");
        footer.className = "services-catalog-card-footer";
        const price = document.createElement("div");
        const priceLabel = document.createElement("small");
        priceLabel.textContent = "A partir de";
        const value = document.createElement("strong");
        value.textContent = Number(service.preco || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        price.append(priceLabel, value);
        const action = document.createElement("span");
        action.className = "services-card-action";
        action.textContent = "Ver detalhes →";
        footer.append(price, action);
        copy.append(heading, description, footer);
        link.append(image, copy);
        article.append(link);
        return article;
    }

    function normalize(value) {
        return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    }

    function serviceImage(name) {
        const value = normalize(name);
        if (value.includes("higienica")) return "/images/services/tosa-higienica.jpg";
        if (value.includes("tosa")) return "/images/services/tosa.jpg";
        if (value.includes("consulta") || value.includes("veterin")) return "/images/services/veterinario.jpg";
        if (value.includes("vacina")) return "/images/services/vacinacao.jpg";
        if (value.includes("hotel") || value.includes("creche")) return "/images/services/hotelzinho.jpg";
        if (value.includes("delivery")) return "/images/services/delivery.jpg";
        return "/images/services/banho-tosa.jpg";
    }
})();
