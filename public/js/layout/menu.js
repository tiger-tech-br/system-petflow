"use strict";

/* ==================================================
   SIDEBAR RESPONSIVA
================================================== */

document.addEventListener("DOMContentLoaded", () => {

    const menuToggle = document.querySelector(".menu-toggle");

    const sidebar = document.querySelector(".sidebar");

    if (!menuToggle || !sidebar) {

        return;

    }

    /* ==================================================
       OVERLAY
    ================================================== */

    let overlay = document.querySelector(".menu-overlay");

    if (!overlay) {

        overlay = document.createElement("div");

        overlay.className = "menu-overlay";

        document.body.appendChild(overlay);

    }

    /* ==================================================
       ABRIR
    ================================================== */

    function abrirSidebar() {

        sidebar.classList.add("active");

        overlay.classList.add("active");

        document.body.style.overflow = "hidden";

        menuToggle.setAttribute("aria-expanded", "true");

    }

    /* ==================================================
       FECHAR
    ================================================== */

    function fecharSidebar() {

        sidebar.classList.remove("active");

        overlay.classList.remove("active");

        document.body.style.overflow = "";

        menuToggle.setAttribute("aria-expanded", "false");

    }

    /* ==================================================
       TOGGLE
    ================================================== */

    function toggleSidebar() {

        sidebar.classList.toggle("active");

        overlay.classList.toggle("active");

        document.body.style.overflow =
            sidebar.classList.contains("active")
                ? "hidden"
                : "";

    }

    /* ==================================================
       EVENTOS
    ================================================== */

    menuToggle.addEventListener("click", toggleSidebar);

    overlay.addEventListener("click", fecharSidebar);

    /* ==================================================
       FECHAR AO CLICAR EM UM LINK
    ================================================== */

    sidebar.querySelectorAll("a").forEach((link) => {

        link.addEventListener("click", () => {

            if (window.innerWidth <= 992) {

                fecharSidebar();

            }

        });

    });

    /* ==================================================
       ESC
    ================================================== */

    document.addEventListener("keydown", (event) => {

        if (event.key === "Escape") {

            fecharSidebar();

        }

    });

    /* ==================================================
       DESKTOP
    ================================================== */

    window.addEventListener("resize", () => {

        if (window.innerWidth > 992) {

            sidebar.classList.remove("active");

            overlay.classList.remove("active");

            document.body.style.overflow = "";

        }

    });

});