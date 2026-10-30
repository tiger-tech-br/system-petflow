"use strict";
const { PRIVACY_POLICY_VERSION } = require("../config/privacyPolicy");
function text(value, max = 300) {
    return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) : "";
}
function validEmail(value) { return /^[^\s@<>"?&#]+@[^\s@<>"?&#]+\.[^\s@<>"?&#]+$/.test(value); }
function publicLegalConfiguration(env = process.env) {
    const data = {
        controllerName: text(env.LEGAL_CONTROLLER_NAME, 150),
        controllerDocument: text(env.LEGAL_CONTROLLER_DOCUMENT, 50),
        controllerAddress: text(env.LEGAL_CONTROLLER_ADDRESS),
        privacyEmail: text(env.LEGAL_PRIVACY_EMAIL, 1000),
        privacyContact: text(env.LEGAL_PRIVACY_CONTACT),
        privacyResponsible: text(env.LEGAL_PRIVACY_RESPONSIBLE, 150),
        policyVersion: PRIVACY_POLICY_VERSION
    };
    if (data.privacyEmail.length > 150 || !validEmail(data.privacyEmail)) data.privacyEmail = "";
    const filled = value => value.length >= 3 && !/^(?:a preencher|seu[ _]|sua[ _]|exemplo|example|xxx|\[|<)/i.test(value);
    // Confirmação operacional do responsável; não é certificação de conformidade.
    data.configured = env.LEGAL_PUBLIC_INFORMATION_CONFIRMED === "true" &&
        [data.controllerName, data.controllerDocument, data.controllerAddress].every(filled) &&
        Boolean(data.privacyEmail || filled(data.privacyContact));
    data.demoMode = !data.configured;
    return data;
}
module.exports = { publicLegalConfiguration, validEmail };
