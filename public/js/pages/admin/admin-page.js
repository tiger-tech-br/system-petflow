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

        bindPageText();
        buildForm();
        bindEvents();
        loadData();
    });

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
            setStatus(error.message || "Nao foi possivel carregar os dados.");
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
            setStatus(error.message || "Nao foi possivel salvar.");
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
            setStatus(error.message || "Nao foi possivel remover.");
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
                ${columns.map(column => `<th>${column.label}</th>`).join("")}
                ${config.mode === "single" ? "" : "<th>Acoes</th>"}
            </tr>
        `;

        if (!filtered.length) {
            body.innerHTML = `
                <tr>
                    <td colspan="${columns.length + 1}">
                        <div class="empty-state">Nenhum registro encontrado.</div>
                    </td>
                </tr>
            `;
            return;
        }

        body.innerHTML = filtered.map(record => `
            <tr>
                ${columns.map(column => `<td>${formatValue(record[column.key] ?? record[toSnake(column.key)])}</td>`).join("")}
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

    function formatValue(value) {
        if (value === null || value === undefined || value === "") {
            return "-";
        }

        if (typeof value === "boolean") {
            return value ? "Sim" : "Nao";
        }

        if (Array.isArray(value)) {
            return `${value.length} item(ns)`;
        }

        return String(value);
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
})();
