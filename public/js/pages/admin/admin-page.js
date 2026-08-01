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
        buildForm();
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

    function buildForm() {
        const form = document.getElementById("recordForm");

        if (!form) {
            return;
        }

        const fields = config.fields || [];

        form.innerHTML = fields.map(field => {
            const required = field.required ? "required" : "";
            const value = field.value || "";

            if (field.type === "textarea" || field.type === "json") {
                return `
                    <div class="form-group">
                        <label for="${field.name}">${field.label}</label>
                        <textarea id="${field.name}" name="${field.name}" class="form-control" ${required}>${value}</textarea>
                    </div>
                `;
            }

            if (field.type === "select") {
                const options = (field.options || []).map(option => {
                    const selected = String(option.value) === String(value) ? "selected" : "";
                    return `<option value="${option.value}" ${selected}>${option.label}</option>`;
                }).join("");

                return `
                    <div class="form-group">
                        <label for="${field.name}">${field.label}</label>
                        <select id="${field.name}" name="${field.name}" class="form-control" ${required}>${options}</select>
                    </div>
                `;
            }

            return `
                <div class="form-group">
                    <label for="${field.name}">${field.label}</label>
                    <input id="${field.name}" name="${field.name}" type="${field.type || "text"}" class="form-control" value="${value}" ${required}>
                </div>
            `;
        }).join("") + `
            <div class="form-actions">
                <button type="button" class="btn" id="cancelEdit">Limpar</button>
                <button type="submit" class="btn btn-primary">Salvar</button>
            </div>
        `;
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

            if (editButton) {
                editRecord(editButton.dataset.id);
            }

            if (deleteButton) {
                deleteRecord(deleteButton.dataset.id);
            }

            if (cancelButton) {
                resetForm();
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

            if (!input) {
                return;
            }

            const value = record[field.name] ?? record[toSnake(field.name)] ?? "";
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

        setText("formTitle", config.formTitle || "Novo registro");
    }

    function readForm() {
        const form = document.getElementById("recordForm");
        const data = {};

        (config.fields || []).forEach(field => {
            const input = form.elements[field.name];
            let value = input ? input.value : "";

            if (field.type === "number") {
                value = value === "" ? null : Number(value);
            }

            if (field.type === "json") {
                try {
                    value = value ? JSON.parse(value) : [];
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
                ${config.mode === "single" ? "" : "<th>Ações</th>"}
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
                ${columns.map(column => `<td>${formatValue(record[column.key] ?? record[toSnake(column.key)], column)}</td>`).join("")}
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
            return value ? "Sim" : "Não";
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
            return `<span class="status-badge">${escapeHtml(String(value).replaceAll("_", " ").toLowerCase())}</span>`;
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

    function toSnake(value) {
        return value.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
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
