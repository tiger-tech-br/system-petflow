"use strict";

document.addEventListener("DOMContentLoaded", () => {
    setupDashboardDate();
    setupDashboardNavigation();
    setupDashboardNotifications();
    bindDashboardActions();
});

function setupDashboardDate() {
    const date = document.getElementById("dashboardDate");

    if (!date) {
        return;
    }

    date.textContent = new Intl.DateTimeFormat("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long"
    }).format(new Date());
}

function setupDashboardNavigation() {
    const sidebar = document.querySelector(".sidebar");
    const toggle = document.querySelector(".admin-menu-toggle");

    if (!sidebar || !toggle) {
        return;
    }

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

    toggle.addEventListener("click", () => {
        const willOpen = !sidebar.classList.contains("active");
        sidebar.classList.toggle("active", willOpen);
        overlay.classList.toggle("active", willOpen);
        document.body.classList.toggle("admin-menu-open", willOpen);
        toggle.setAttribute("aria-expanded", String(willOpen));
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

function bindDashboardActions() {
    const refresh = document.getElementById("btnAtualizar");

    if (!refresh) {
        return;
    }

    refresh.addEventListener("click", () => {
        refresh.classList.add("is-loading");
        window.setTimeout(() => refresh.classList.remove("is-loading"), 500);
    });
}

function setupDashboardNotifications() {
    const button = document.getElementById("notificationButton");
    const panel = document.getElementById("notificationPanel");
    const count = document.getElementById("notificationCount");
    const status = document.getElementById("notificationStatus");

    if (!button || !panel || !count || !status) {
        return;
    }

    let unread = Number(count.textContent || 0);
    let audioUnlocked = false;

    function updateNotificationState() {
        count.textContent = String(unread);
        count.hidden = unread <= 0;
        status.textContent = unread === 1 ? "1 novo pedido" : `${unread} novos pedidos`;
        button.classList.toggle("has-notification", unread > 0);
    }

    function playNotificationSound() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;

        if (!AudioContext) {
            return;
        }

        const context = new AudioContext();
        const gain = context.createGain();
        gain.gain.setValueAtTime(0.0001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.42);
        gain.connect(context.destination);

        [740, 980].forEach((frequency, index) => {
            const oscillator = context.createOscillator();
            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(frequency, context.currentTime + index * 0.12);
            oscillator.connect(gain);
            oscillator.start(context.currentTime + index * 0.12);
            oscillator.stop(context.currentTime + index * 0.12 + 0.18);
        });
    }

    function openPanel() {
        panel.classList.add("active");
        button.setAttribute("aria-expanded", "true");
        unread = 0;
        updateNotificationState();
    }

    function closePanel() {
        panel.classList.remove("active");
        button.setAttribute("aria-expanded", "false");
    }

    button.addEventListener("click", event => {
        event.stopPropagation();
        audioUnlocked = true;

        if (panel.classList.contains("active")) {
            closePanel();
            return;
        }

        openPanel();
    });

    document.addEventListener("click", event => {
        if (!event.target.closest(".notification-menu")) {
            closePanel();
        }
    });

    window.setTimeout(() => {
        unread = Math.max(unread, 1);
        updateNotificationState();

        if (audioUnlocked) {
            playNotificationSound();
        }
    }, 1200);

    updateNotificationState();
}
