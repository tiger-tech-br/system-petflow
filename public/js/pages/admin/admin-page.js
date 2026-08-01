"use strict";

(function () {
    const config = window.PetFlowAdminPage;

    if (!config) {
        return;
    }

    let records = [];
    let editingId = null;

    document.addEventListener("DOMContentLoaded", () => {
        if (typeof requireAuth === "function") {
            requireAuth();
        }

        setupAdminNavigation();
        bindPageText();
        buildInsights();
        buildPipeline();
        buildForm();
        populateRemoteSelects();
        bindEvents();
        loadData();
    });

    function setupAdminNavigation() {
        const sidebar = document.querySelector(".sidebar");
        const topbar = document.querySelector(".topbar");

        if (!sidebar || !topbar || topbar.querySelector(".admin-menu-toggle")) {
            return;
        }

        const title = topbar.querySelector(".topbar-title");
        const left = document.createElement("div");
        left.className = "topbar-left";

        const toggle = document.createElement("button");
        toggle.className = "admin-menu-toggle";
        toggle.type = "button";
        toggle.setAttribute("aria-label", "Abrir menu administrativo");
        toggle.setAttribute("aria-expanded", "false");
        toggle.innerHTML = `<i class="fa-solid fa-bars"></i>`;

        left.appendChild(toggle);

        if (title) {
            left.appendChild(title);
        }

        topbar.prepend(left);

        let overlay = document.querySelector(".admin-menu-overlay");

        if (!overlay) {
            overlay = document.createElement("div");
            overlay.className = "admin-menu-overlay";
            document.body.appendChild(overlay);
        }

        function closeSidebar() {
            sidebar.classList.remove("active");
            overlay.classList.remove("active");
            document.body.classList.remove("admin-menu-open");
            toggle.setAttribute("aria-expanded", "false");
        }

        function openSidebar() {
            sidebar.classList.add("active");
            overlay.classList.add("active");
            document.body.classList.add("admin-menu-open");
            toggle.setAttribute("aria-expanded", "true");
        }

        toggle.addEventListener("click", () => {
            if (sidebar.classList.contains("active")) {
                closeSidebar();
                return;
            }

            openSidebar();
        });

        overlay.addEventListener("click", closeSidebar);

        sidebar.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                if (window.innerWidth <= 1024) {
                    closeSidebar();
                }
            });
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                closeSidebar();
            }
        });

        window.addEventListener("resize", () => {
            if (window.innerWidth > 1024) {
                closeSidebar();
            }
        });
    }

    function bindPageText() {
        setText("moduleTitle", config.title);
        setText("moduleSubtitle", config.subtitle);
        setText("tableTitle", config.tableTitle || config.title);
        setText("formTitle", config.formTitle || `Novo registro`);

        const icon = document.getElementById("moduleIcon");
        if (icon) {
            icon.className = `fa-solid ${config.icon || "fa-table"}`;
        }

        document.querySelectorAll("[data-active-page]").forEach(link => {
            if (link.dataset.activePage === config.key) {
                link.classList.add("active");
            }
        });
    }

    function buildInsights() {
        const pageHeader = document.querySelector(".page-header");

        if (!pageHeader || !Array.isArray(config.insights) || document.querySelector(".admin-insights")) {
            return;
        }

        const insights = document.createElement("section");
        insights.className = "admin-insights";
        insights.setAttribute("aria-label", "Resumo da página");
        insights.innerHTML = config.insights.map(item => `
            <article class="insight-card">
                <i class="fa-solid ${item.icon || "fa-circle-info"}"></i>
                <div>
                    <span>${escapeHtml(item.label || "")}</span>
                    <strong>${escapeHtml(item.value || "")}</strong>
                    <small>${escapeHtml(item.note || "")}</small>
                </div>
            </article>
        `).join("");

        pageHeader.insertAdjacentElement("afterend", insights);
    }

    function buildPipeline() {
        const insights = document.querySelector(".admin-insights");
        const pageHeader = document.querySelector(".page-header");
        const anchor = insights || pageHeader;

        if (!anchor || !Array.isArray(config.pipeline) || document.querySelector(".order-pipeline")) {
            return;
        }

        const pipeline = document.createElement("section");
        pipeline.className = "order-pipeline";
        pipeline.setAttribute("aria-label", "Etapas dos pedidos");
        pipeline.innerHTML = config.pipeline.map((step, index) => `
            <article class="pipeline-step">
                <div class="pipeline-icon"><i class="fa-solid ${step.icon || "fa-circle"}"></i></div>
                <div>
                    <span>Etapa ${index + 1}</span>
                    <strong>${escapeHtml(step.label || "")}</strong>
                    <small>${escapeHtml(step.note || "")}</small>
                </div>
                <b>${escapeHtml(step.value || "0")}</b>
            </article>
        `).join("");

        anchor.insertAdjacentElement("afterend", pipeline);
    }

    function buildForm() {
        const form = document.getElementById("recordForm");

        if (!form) {
            return;
        }

        const fields = config.fields || [];

        form.innerHTML = fields.map(field => {
            const required = field.required ?"required" : "";
            const value = field.value || "";

            if (field.type === "items-builder") {
                return buildItemsBuilderField(field);
            }

            if (field.type === "textarea" || field.type === "json") {
                return `
                    <div class="form-group">
                        <label for="${field.name}">${field.label}</label>
                        <textarea id="${field.name}" name="${field.name}" class="form-control" ${required}>${value}</textarea>
                    </div>
                `;
            }

            if (field.type === "select" || field.type === "remote-select") {
                const options = (field.options || []).map(option => {
                    const selected = String(option.value) === String(value) ?"selected" : "";
                    return `<option value="${escapeHtml(option.value)}" ${selected}>${escapeHtml(option.label)}</option>`;
                }).join("");
                const placeholder = field.placeholder || "Selecione";
                const remoteOption = field.type === "remote-select" && !options
                    ?`<option value="">Carregando...</option>`
                    : `<option value="">${escapeHtml(placeholder)}</option>`;

                return `
                    <div class="form-group">
                        <label for="${field.name}">${field.label}</label>
                        <select id="${field.name}" name="${field.name}" class="form-control" ${required}>${remoteOption}${options}</select>
                    </div>
                `;
            }

            return `
                <div class="form-group">
                    <label for="${field.name}">${field.label}</label>
                    <input id="${field.name}" name="${field.name}" type="${field.type || "text"}" class="form-control" value="${value}" ${buildFieldAttributes(field)} ${required}>
                </div>
            `;
        }).join("") + `
            <div class="form-actions">
                <button type="button" class="btn" id="cancelEdit">Limpar</button>
                <button type="submit" class="btn btn-primary">Salvar</button>
            </div>
        `;
    }

    async function populateRemoteSelects() {
        const fields = (config.fields || []).filter(field => field.type === "remote-select" && field.endpoint);

        await Promise.all(fields.map(async field => {
            const select = document.getElementById(field.name);

            if (!select) {
                return;
            }

            try {
                const response = await apiGet(field.endpoint);
                const rows = normalizeResponse(response);
                const labelKey = field.labelKey || "nome";
                const valueKey = field.valueKey || "id";
                const placeholder = field.placeholder || "Selecione";

                select.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>` + rows.map(row => {
                    const value = row[valueKey] || "";
                    const label = row[labelKey] || row.nome || row.email || value;
                    return `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`;
                }).join("");
            } catch {
                select.innerHTML = `<option value="">Não foi possível carregar</option>`;
            }
        }));

        await populateItemsBuilders();
    }

    async function populateItemsBuilders() {
        const fields = (config.fields || []).filter(field => field.type === "items-builder" && field.endpoint);

        await Promise.all(fields.map(async field => {
            try {
                const response = await apiGet(field.endpoint);
                const rows = normalizeResponse(response);
                const builder = document.querySelector(`[data-items-builder="${field.name}"]`);

                if (!builder) {
                    return;
                }

                builder.dataset.options = JSON.stringify(rows.map(row => ({
                    value: row[field.valueKey || "id"],
                    label: row[field.labelKey || "nome"],
                    price: row[field.priceKey || "preco"] || 0
                })));

                const list = builder.querySelector("[data-items-list]");
                if (list && !list.children.length) {
                    addItemRow(field.name);
                }
            } catch {
                const builder = document.querySelector(`[data-items-builder="${field.name}"]`);
                if (builder) {
                    builder.querySelector("[data-items-list]").innerHTML = `
                        <div class="items-builder-empty">Não foi possível carregar os produtos.</div>
                    `;
                }
            }
        }));
    }

    function bindEvents() {
        const search = document.getElementById("pageSearch");
        const refresh = document.getElementById("refreshPage");
        const form = document.getElementById("recordForm");

        if (search) {
            search.addEventListener("input", renderTable);
        }

        if (refresh) {
            refresh.addEventListener("click", loadData);
        }

        if (form) {
            form.addEventListener("submit", saveRecord);
        }

        document.addEventListener("click", event => {
            const editButton = event.target.closest("[data-action='edit']");
            const deleteButton = event.target.closest("[data-action='delete']");
            const cancelButton = event.target.closest("#cancelEdit");
            const addItemButton = event.target.closest("[data-action='add-item']");
            const removeItemButton = event.target.closest("[data-action='remove-item']");

            if (editButton) {
                editRecord(editButton.dataset.id);
            }

            if (deleteButton) {
                deleteRecord(deleteButton.dataset.id);
            }

            if (cancelButton) {
                resetForm();
            }

            if (addItemButton) {
                addItemRow(addItemButton.dataset.field);
            }

            if (removeItemButton) {
                const row = removeItemButton.closest(".items-builder-row");
                const builder = removeItemButton.closest("[data-items-builder]");
                row?.remove();
                refreshItemsBuilderTotal(builder);
            }
        });

        document.addEventListener("change", event => {
            const productSelect = event.target.closest("[data-item-product]");

            if (!productSelect) {
                return;
            }

            const selected = productSelect.selectedOptions[0];
            const row = productSelect.closest(".items-builder-row");
            const price = row?.querySelector("[data-item-price]");

            if (price && selected?.dataset.price) {
                price.value = Number(selected.dataset.price).toFixed(2);
            }

            refreshItemsBuilderTotal(productSelect.closest("[data-items-builder]"));
        });

        document.addEventListener("input", event => {
            if (event.target.closest("[data-item-quantity]") || event.target.closest("[data-item-price]")) {
                refreshItemsBuilderTotal(event.target.closest("[data-items-builder]"));
            }
        });
    }

    async function loadData() {
        setStatus("Carregando dados...");

        try {
            if (config.mode === "single") {
                const response = await apiGet(config.endpoint);
                records = normalizeResponse(response).filter(Boolean);
                fillForm(records[0] || {});
            } else {
                const response = await apiGet(config.endpoint);
                records = normalizeResponse(response);
            }

            renderTable();
            setStatus(`${records.length} registro(s) carregado(s).`);
        } catch (error) {
            records = [];
            renderTable();
            setStatus(error.message || "Não foi possível carregar os dados.");
        }
    }

    async function saveRecord(event) {
        event.preventDefault();

        const payload = readForm();
        setStatus("Salvando...");

        try {
            if (config.mode === "single") {
                await apiPut(config.endpoint, payload);
            } else if (editingId) {
                await apiPut(`${config.endpoint}/${editingId}`, payload);
            } else {
                await apiPost(config.endpoint, payload);
            }

            resetForm();
            await loadData();
            setStatus("Registro salvo com sucesso.");
        } catch (error) {
            setStatus(error.message || "Não foi possível salvar.");
        }
    }

    async function deleteRecord(id) {
        if (!id || !confirm("Deseja remover este registro?")) {
            return;
        }

        setStatus("Removendo...");

        try {
            await apiDelete(`${config.endpoint}/${id}`);
            await loadData();
            setStatus("Registro removido com sucesso.");
        } catch (error) {
            setStatus(error.message || "Não foi possível remover.");
        }
    }

    function editRecord(id) {
        const record = records.find(item => String(item.id) === String(id));

        if (!record) {
            return;
        }

        editingId = id;
        fillForm(record);
        setText("formTitle", "Editar registro");
    }

    function fillForm(record) {
        (config.fields || []).forEach(field => {
            const input = document.querySelector(`[name="${field.name}"]`);

            if (field.type === "items-builder") {
                fillItemsBuilder(field.name, record[field.name] || record[toSnake(field.name)] || []);
                return;
            }

            if (!input) {
                return;
            }

            const value = record[field.name] || record[toSnake(field.name)] || "";
            input.value = field.type === "json" && typeof value !== "string"
                ? JSON.stringify(value || [], null, 2)
                : value;
        });
    }

    function resetForm() {
        editingId = null;
        const form = document.getElementById("recordForm");

        if (form) {
            form.reset();
        }

        document.querySelectorAll("[data-items-builder]").forEach(builder => {
            const list = builder.querySelector("[data-items-list]");
            if (list) {
                list.innerHTML = "";
                addItemRow(builder.dataset.itemsBuilder);
            }
        });

        setText("formTitle", config.formTitle || "Novo registro");
    }

    function readForm() {
        const form = document.getElementById("recordForm");
        const data = {};

        (config.fields || []).forEach(field => {
            if (field.type === "items-builder") {
                data[field.name] = readItemsBuilder(field.name);
                return;
            }

            const input = form.elements[field.name];
            let value = input ?input.value : "";

            if (field.type === "number") {
                value = value === "" ?null : Number(value);
            }

            if ((field.type === "select" || field.type === "remote-select") && value === "") {
                value = null;
            }

            if (field.type === "json") {
                try {
                    value = value ?JSON.parse(value) : [];
                } catch {
                    value = [];
                }
            }

            data[field.name] = value;
        });

        return data;
    }

    function renderTable() {
        const head = document.getElementById("tableHead");
        const body = document.getElementById("tableBody");
        const search = (document.getElementById("pageSearch")?.value || "").toLowerCase();

        if (!head || !body) {
            return;
        }

        const columns = config.columns || [];
        const filtered = records.filter(record => JSON.stringify(record).toLowerCase().includes(search));

        head.innerHTML = `
            <tr>
                ${columns.map(column => `<th>${escapeHtml(column.label)}</th>`).join("")}
                ${config.mode === "single" ?"" : "<th>Ações</th>"}
            </tr>
        `;

        if (!filtered.length) {
            body.innerHTML = `
                <tr>
                    <td colspan="${columns.length + 1}">
                        <div class="empty-state">
                            <i class="fa-regular fa-folder-open"></i>
                            <strong>Nenhum registro encontrado</strong>
                            <span>Use o formulário ao lado para cadastrar o primeiro item.</span>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        body.innerHTML = filtered.map(record => `
            <tr>
                ${columns.map(column => `<td>${formatValue(record[column.key] || record[toSnake(column.key)], column)}</td>`).join("")}
                ${config.mode === "single" ? "" : `
                    <td>
                        <div class="row-actions">
                            <button class="icon-btn" type="button" data-action="edit" data-id="${record.id}" title="Editar">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="icon-btn" type="button" data-action="delete" data-id="${record.id}" title="Excluir">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `}
            </tr>
        `).join("");
    }

    function normalizeResponse(response) {
        if (Array.isArray(response)) {
            return response;
        }

        if (Array.isArray(response?.data)) {
            return response.data;
        }

        if (response?.data) {
            return [response.data];
        }

        return [];
    }

    function formatValue(value, column = {}) {
        if (value === null || value === undefined || value === "") {
            return "-";
        }

        if (typeof value === "boolean") {
            return value ?"Sim" : "Não";
        }

        if (Array.isArray(value)) {
            return `${value.length} item(ns)`;
        }

        if (column.type === "currency" || ["preco", "custo", "valor_total", "total"].includes(column.key)) {
            const number = Number(value);

            if (!Number.isNaN(number)) {
                return number.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL"
                });
            }
        }

        if (column.type === "status" || column.key === "status") {
            return `<span class="status-badge">${escapeHtml(formatStatusLabel(value))}</span>`;
        }

        return escapeHtml(String(value));
    }

    function setText(id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = value || "";
        }
    }

    function setStatus(message) {
        setText("statusLine", message);
    }

    function formatStatusLabel(value) {
        const labels = {
            PENDENTE: "Pendente",
            AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
            PAGAMENTO_APROVADO: "Pagamento aprovado",
            EM_SEPARACAO: "Em separação",
            SAIU_PARA_ENTREGA: "Saiu para entrega",
            ENTREGUE: "Entregue",
            FINALIZADA: "Finalizado",
            CANCELADA: "Cancelado",
            AGENDADO: "Agendado",
            CONFIRMADO: "Confirmado",
            CONCLUIDO: "Concluído",
            CANCELADO: "Cancelado",
            PAGO: "Pago",
            ATRASADO: "Atrasado"
        };

        return labels[value] || String(value).replaceAll("_", " ").toLowerCase();
    }

    function toSnake(value) {
        return value.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }

    function buildFieldAttributes(field) {
        const attributes = [];

        ["placeholder", "min", "max", "step", "pattern", "title", "minlength", "maxlength"].forEach(attribute => {
            if (field[attribute] !== undefined && field[attribute] !== null) {
                attributes.push(`${attribute}="${escapeHtml(field[attribute])}"`);
            }
        });

        return attributes.join(" ");
    }

    function buildItemsBuilderField(field) {
        return `
            <div class="form-group items-builder" data-items-builder="${field.name}" data-product-key="${field.productKey || "produto_id"}" data-price-key="${field.priceField || "valor_unitario"}">
                <div class="items-builder-header">
                    <label>${escapeHtml(field.label || "Itens")}</label>
                    <button class="btn btn-small" type="button" data-action="add-item" data-field="${field.name}">
                        <i class="fa-solid fa-plus"></i>Adicionar item
                    </button>
                </div>
                <div class="items-builder-columns">
                    <span>Produto</span>
                    <span>Qtd</span>
                    <span>Valor unit.</span>
                    <span></span>
                </div>
                <div class="items-builder-list" data-items-list></div>
                <div class="items-builder-total">
                    <span>Total estimado</span>
                    <strong data-items-total>R$ 0,00</strong>
                </div>
            </div>
        `;
    }

    function addItemRow(fieldName, item = {}) {
        const builder = document.querySelector(`[data-items-builder="${fieldName}"]`);
        const list = builder?.querySelector("[data-items-list]");

        if (!builder || !list) {
            return;
        }

        const options = JSON.parse(builder.dataset.options || "[]");
        const productValue = item.produto_id || item.produtoId || item.id || "";
        const quantity = item.quantidade || 1;
        const price = item.valor_unitario || item.valorUnitario || item.preco_unitario || item.preco || 0;

        const row = document.createElement("div");
        row.className = "items-builder-row";
        row.innerHTML = `
            <select class="form-control" data-item-product required>
                <option value="">Selecione</option>
                ${options.map(option => `
                    <option value="${escapeHtml(option.value)}" data-price="${escapeHtml(option.price)}" ${String(option.value) === String(productValue) ?"selected" : ""}>
                        ${escapeHtml(option.label || option.value)}
                    </option>
                `).join("")}
            </select>
            <input class="form-control" type="number" min="1" step="1" value="${escapeHtml(quantity)}" data-item-quantity required>
            <input class="form-control" type="number" min="0" step="0.01" value="${escapeHtml(price)}" data-item-price required>
            <button class="icon-btn" type="button" data-action="remove-item" title="Remover item">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;

        list.appendChild(row);
        refreshItemsBuilderTotal(builder);
    }

    function fillItemsBuilder(fieldName, items) {
        const builder = document.querySelector(`[data-items-builder="${fieldName}"]`);
        const list = builder?.querySelector("[data-items-list]");

        if (!builder || !list) {
            return;
        }

        list.innerHTML = "";
        (Array.isArray(items) && items.length ?items : [{}]).forEach(item => addItemRow(fieldName, item));
        refreshItemsBuilderTotal(builder);
    }

    function readItemsBuilder(fieldName) {
        const builder = document.querySelector(`[data-items-builder="${fieldName}"]`);
        const productKey = builder?.dataset.productKey || "produto_id";
        const priceKey = builder?.dataset.priceKey || "valor_unitario";

        return [...(builder?.querySelectorAll(".items-builder-row") || [])]
            .map(row => {
                const produto = row.querySelector("[data-item-product]")?.value;
                const quantidade = Number(row.querySelector("[data-item-quantity]")?.value || 0);
                const valor = Number(row.querySelector("[data-item-price]")?.value || 0);

                return {
                    [productKey]: produto,
                    quantidade,
                    [priceKey]: valor
                };
            })
            .filter(item => item[productKey] && item.quantidade > 0);
    }

    function refreshItemsBuilderTotal(builder) {
        if (!builder) {
            return;
        }

        const total = [...builder.querySelectorAll(".items-builder-row")].reduce((sum, row) => {
            const quantity = Number(row.querySelector("[data-item-quantity]")?.value || 0);
            const price = Number(row.querySelector("[data-item-price]")?.value || 0);
            return sum + quantity * price;
        }, 0);

        const totalElement = builder.querySelector("[data-items-total]");
        if (totalElement) {
            totalElement.textContent = total.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL"
            });
        }
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }
})();
