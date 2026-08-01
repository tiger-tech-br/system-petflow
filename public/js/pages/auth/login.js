"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");

    if (!loginForm) {
        return;
    }

    loginForm.addEventListener("submit", handleLogin);
    document.querySelector("[data-admin-forgot-password]")?.addEventListener("click", handleForgotPassword);
});

async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById("email");
    const password = document.getElementById("senha") || document.getElementById("password");

    if (!validateRequired(email, "Informe o e-mail.")) {
        return;
    }

    if (!validateEmail(email)) {
        return;
    }

    if (!validateRequired(password, "Informe a senha.")) {
        return;
    }

    if (!validatePassword(password)) {
        return;
    }

    try {
        const response = await AuthService.login({
            email: email.value.trim(),
            senha: password.value
        });

        saveToken(response.data.token);
        saveUser(response.data.user);

        window.location.href = "/admin/pages/dashboard/dashboard.html";
    } catch (error) {
        alert(error.message || "Erro ao realizar login.");
    }
}

function handleForgotPassword(event) {
    event.preventDefault();
    alert("Recuperacao de senha administrativa em preparacao. Por enquanto, solicite a redefinicao ao responsavel pela loja.");
}
