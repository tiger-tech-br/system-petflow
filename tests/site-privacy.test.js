"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { PRIVACY_POLICY_VERSION } = require("../config/privacyPolicy");
const { publicLegalConfiguration, validEmail } = require("../services/publicLegalService");
const { acknowledged, remember, applyInformation, VERSION, KEY } = require("../public/js/legal/site-privacy");

function ownConfiguration(extra = {}) {
    return {
        LEGAL_CONTROLLER_NAME: "Loja de Demonstração Ltda.",
        LEGAL_CONTROLLER_DOCUMENT: "Documento sintético da loja",
        LEGAL_CONTROLLER_ADDRESS: "Endereço público sintético da loja",
        LEGAL_PRIVACY_EMAIL: "privacidade@example.test",
        LEGAL_PRIVACY_CONTACT: "Atendimento de privacidade pela loja",
        LEGAL_PRIVACY_RESPONSIBLE: "Equipe responsável da loja",
        LEGAL_PUBLIC_INFORMATION_CONFIRMED: "true",
        ...extra
    };
}

test("configuração pública utiliza somente campos permitidos e versão compilada, sem ler segredos", () => {
    const env = ownConfiguration({ PRIVACY_POLICY_VERSION: "1900-01-01", PRIVATE_NOTE: "private-marker" });
    for (const key of ["DATABASE_URL", "JWT_SECRET", "PAGSEGURO_TOKEN", "RESEND_API_KEY", "CLOUDINARY_API_SECRET"]) {
        Object.defineProperty(env, key, { enumerable: true, get() { assert.fail("Não deve ler " + key); } });
    }
    const data = publicLegalConfiguration(env);
    assert.deepEqual(Object.keys(data).sort(), [
        "configured", "controllerAddress", "controllerDocument", "controllerName", "demoMode",
        "policyVersion", "privacyContact", "privacyEmail", "privacyResponsible"
    ]);
    assert.equal(data.policyVersion, PRIVACY_POLICY_VERSION);
    assert.equal(VERSION, PRIVACY_POLICY_VERSION);
    assert.equal(data.configured, true);
    assert.equal(data.demoMode, false);
    assert.doesNotMatch(JSON.stringify(data), /private-marker|1900-01-01|JWT_SECRET|DATABASE_URL|PAGSEGURO_TOKEN/);
    assert.deepEqual(publicLegalConfiguration({}), {
        controllerName: "", controllerDocument: "", controllerAddress: "", privacyEmail: "",
        privacyContact: "", privacyResponsible: "", policyVersion: PRIVACY_POLICY_VERSION,
        configured: false, demoMode: true
    });
});

test("configuração não declara informações confirmadas sem confirmação explícita e identificação mínima", () => {
    for (const confirmation of [undefined, null, false, true, "TRUE", "false", "true ", 1]) {
        const data = publicLegalConfiguration(ownConfiguration({ LEGAL_PUBLIC_INFORMATION_CONFIRMED: confirmation }));
        assert.equal(data.configured, false, "Confirmação inválida: " + String(confirmation));
        assert.equal(data.demoMode, true);
    }
    for (const key of ["LEGAL_CONTROLLER_NAME", "LEGAL_CONTROLLER_DOCUMENT", "LEGAL_CONTROLLER_ADDRESS"]) {
        for (const value of [undefined, null, false, "", "  ", "ab", "A preencher", "SEU_NOME", "sua loja", "Exemplo de loja", "example shop", "xxx", "[definir]", "<informar>"]) {
            const data = publicLegalConfiguration(ownConfiguration({ [key]: value }));
            assert.equal(data.configured, false, key + " não preenchido: " + String(value));
            assert.equal(data.demoMode, true);
        }
    }
    const missingContact = publicLegalConfiguration(ownConfiguration({ LEGAL_PRIVACY_EMAIL: "", LEGAL_PRIVACY_CONTACT: "A preencher" }));
    assert.equal(missingContact.configured, false);
    // Um canal público escrito pode atender a identificação sem inventar e-mail ou DPO.
    const writtenContact = publicLegalConfiguration(ownConfiguration({ LEGAL_PRIVACY_EMAIL: "", LEGAL_PRIVACY_RESPONSIBLE: "" }));
    assert.equal(writtenContact.configured, true);
    assert.equal(writtenContact.privacyEmail, "");
    assert.equal(writtenContact.privacyResponsible, "");
});

test("campos públicos tratam controles, tipos inválidos, espaços e limites de tamanho", () => {
    const sanitized = publicLegalConfiguration(ownConfiguration({
        LEGAL_CONTROLLER_NAME: "\0  Loja\r\nPet\tFlow\u007f  ",
        LEGAL_CONTROLLER_DOCUMENT: "D".repeat(70),
        LEGAL_CONTROLLER_ADDRESS: "A".repeat(400),
        LEGAL_PRIVACY_CONTACT: "C".repeat(400),
        LEGAL_PRIVACY_RESPONSIBLE: "R".repeat(200)
    }));
    assert.equal(sanitized.controllerName, "Loja  Pet Flow");
    for (const value of Object.values(sanitized).filter(value => typeof value === "string")) assert.doesNotMatch(value, /[\u0000-\u001f\u007f]/);
    assert.equal(sanitized.controllerDocument.length, 50);
    assert.equal(sanitized.controllerAddress.length, 300);
    assert.equal(sanitized.privacyContact.length, 300);
    assert.equal(sanitized.privacyResponsible.length, 150);
    assert.equal(publicLegalConfiguration(ownConfiguration({ LEGAL_CONTROLLER_NAME: "N".repeat(200) })).controllerName.length, 150);
    const invalid = publicLegalConfiguration(ownConfiguration({
        LEGAL_CONTROLLER_NAME: {}, LEGAL_CONTROLLER_DOCUMENT: 123, LEGAL_CONTROLLER_ADDRESS: [],
        LEGAL_PRIVACY_EMAIL: false, LEGAL_PRIVACY_CONTACT: {}, LEGAL_PRIVACY_RESPONSIBLE: true
    }));
    for (const key of ["controllerName", "controllerDocument", "controllerAddress", "privacyEmail", "privacyContact", "privacyResponsible"]) assert.equal(invalid[key], "");
    assert.equal(invalid.demoMode, true);
});

test("e-mail público inválido não vira contato confirmado quando não existe outro canal", () => {
    for (const email of ["sem-arroba", "nome@", "@example.test", "a@@example.test", "a@example.test?subject=teste", "a@example.test#fragment", "a@example.test&cc=outro", "<a@example.test>", "a\r\n@example.test", "a b@example.test"]) {
        assert.equal(validEmail(email), false, email);
        const data = publicLegalConfiguration(ownConfiguration({ LEGAL_PRIVACY_EMAIL: email, LEGAL_PRIVACY_CONTACT: "" }));
        assert.equal(data.privacyEmail, "");
        assert.equal(data.configured, false);
    }
    assert.equal(validEmail("direitos+loja@example.test"), true);
    assert.equal(publicLegalConfiguration(ownConfiguration({ LEGAL_PRIVACY_EMAIL: "  direitos+loja@example.test  " })).privacyEmail, "direitos+loja@example.test");
});

test("e-mail longo é rejeitado em vez de truncado para outro endereço sintaticamente válido", () => {
    const email = "direitos@" + "x".repeat(130) + ".example.test";
    assert.ok(email.length > 150);
    assert.equal(validEmail(email), true);
    assert.equal(validEmail(email.slice(0, 150)), true, "A truncagem anterior criaria outro endereço ainda aceito pelo validador.");
    const data = publicLegalConfiguration(ownConfiguration({ LEGAL_PRIVACY_EMAIL: email, LEGAL_PRIVACY_CONTACT: "" }));
    assert.equal(data.privacyEmail, "");
    assert.equal(data.configured, false);
    assert.equal(data.demoMode, true);
    const withOtherChannel = publicLegalConfiguration(ownConfiguration({ LEGAL_PRIVACY_EMAIL: email }));
    assert.equal(withOtherChannel.privacyEmail, "");
    assert.equal(withOtherChannel.configured, true, "O outro canal continua disponível sem publicar o endereço truncado.");
});

test("aviso de privacidade registra apenas versão e horário, preservando conta e sacola", () => {
    const records = new Map([["petflow_customer_token", "synthetic-session"], ["petflow_public_cart", '{"synthetic-item":1}']]);
    const reads = [], writes = [];
    const storage = {
        getItem(key) { reads.push(key); return records.get(key) ?? null; },
        setItem(key, value) { writes.push(key); records.set(key, value); }
    };
    assert.equal(acknowledged(storage), false);
    remember(storage);
    assert.equal(acknowledged(storage), true);
    assert.deepEqual(reads, [KEY, KEY]);
    assert.deepEqual(writes, [KEY]);
    assert.equal(records.get("petflow_customer_token"), "synthetic-session");
    assert.equal(records.get("petflow_public_cart"), '{"synthetic-item":1}');
    const saved = JSON.parse(records.get(KEY));
    assert.deepEqual(Object.keys(saved).sort(), ["acknowledgedAt", "version"]);
    assert.equal(saved.version, PRIVACY_POLICY_VERSION);
    assert.match(saved.acknowledgedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    assert.ok(Number.isFinite(Date.parse(saved.acknowledgedAt)));
    assert.doesNotMatch(records.get(KEY), /synthetic-session|synthetic-item|email|consent|aceite|customer/);
});

test("aviso tolera armazenamento bloqueado, ausente ou corrompido e versão anterior", () => {
    const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
    for (const storage of [blocked, null, undefined, {}]) {
        assert.equal(acknowledged(storage), false);
        assert.doesNotThrow(() => remember(storage));
    }
    for (const value of [null, "", "{", "undefined", "true", "[]", '"texto"', '{"version":"old"}', '{"acknowledgedAt":"2026-01-01"}']) {
        assert.equal(acknowledged({ getItem: () => value }), false, String(value));
    }
});

function legalDocument() {
    const fields = Object.fromEntries([
        "controllerName", "controllerDocument", "controllerAddress", "privacyEmail",
        "privacyContact", "privacyResponsible", "policyVersion", "unknownField"
    ].map(key => {
        const node = { dataset: { legalField: key }, textContent: "Texto anterior" };
        Object.defineProperty(node, "innerHTML", { set() { assert.fail("Dados públicos não podem ser inseridos como HTML."); } });
        return [key, node];
    }));
    const notice = { hidden: true };
    const attributes = new Map([["href", "javascript:stale"]]);
    const link = {
        hidden: false,
        setAttribute(name, value) { attributes.set(name, value); },
        removeAttribute(name) { attributes.delete(name); }
    };
    const document = {
        querySelectorAll(selector) {
            if (selector === "[data-legal-field]") return Object.values(fields);
            if (selector === "[data-legal-demo-notice]") return [notice];
            if (selector === "[data-legal-email]") return [link];
            assert.fail("Consulta inesperada: " + selector);
        }
    };
    return { document, fields, notice, link, attributes };
}

test("página aplica somente campos conhecidos como texto, sem interpretar marcação", () => {
    const page = legalDocument();
    const literal = '<img src=x onerror="alert(1)">';
    applyInformation(page.document, { controllerName: literal, controllerAddress: "A".repeat(500), unknownField: "não publicar", configured: true });
    assert.equal(page.fields.controllerName.textContent, literal);
    assert.equal(page.fields.controllerAddress.textContent, "A".repeat(400));
    assert.equal(page.fields.unknownField.textContent, "Texto anterior");
    assert.equal(page.notice.hidden, true);
    assert.equal(page.link.hidden, true);
    assert.equal(page.attributes.has("href"), false);
});

test("página mantém informações e aviso demonstrativos quando a configuração está ausente ou não confirmada", () => {
    for (const value of [null, undefined, {}, "inválido", { configured: "true" }, { configured: 1 }, { configured: false }]) {
        const page = legalDocument();
        applyInformation(page.document, value);
        assert.equal(page.notice.hidden, false);
        assert.match(page.fields.controllerName.textContent, /ainda não informado/);
        assert.match(page.fields.controllerDocument.textContent, /ainda não informado/);
        assert.match(page.fields.privacyContact.textContent, /ainda não configurado/);
        assert.equal(page.fields.policyVersion.textContent, PRIVACY_POLICY_VERSION);
        assert.equal(page.fields.unknownField.textContent, "Texto anterior");
    }
    const page = legalDocument();
    applyInformation(page.document, { controllerName: "  ", controllerDocument: false, privacyContact: {} });
    assert.match(page.fields.controllerName.textContent, /ainda não informado/);
    assert.match(page.fields.controllerDocument.textContent, /ainda não informado/);
    assert.match(page.fields.privacyContact.textContent, /ainda não configurado/);
});

test("link de privacidade usa mailto codificado e remove um href anterior em resposta inválida", () => {
    const page = legalDocument();
    applyInformation(page.document, { privacyEmail: "direitos+loja@example.test", configured: true });
    assert.equal(page.link.hidden, false);
    assert.equal(page.attributes.get("href"), "mailto:direitos%2Bloja%40example.test");
    for (const email of [null, 23, "", "javascript:alert(1)", "a@example.test?subject=teste", "a@example.test&bcc=outro", "a\n@example.test", 'a"@example.test']) {
        applyInformation(page.document, { privacyEmail: email });
        assert.equal(page.link.hidden, true, String(email));
        assert.equal(page.attributes.has("href"), false);
    }
    applyInformation(page.document, { privacyEmail: "novo@example.test" });
    assert.equal(page.attributes.get("href"), "mailto:novo%40example.test");
    applyInformation(page.document, null);
    assert.equal(page.link.hidden, true);
    assert.equal(page.attributes.has("href"), false);
});
