document.addEventListener("DOMContentLoaded", () => {
    const yearElement = document.getElementById("year");
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }

    const currentPath = window.location.pathname.split("/").pop() || "index.html";
    const navLinks = document.querySelectorAll(".nav-links a");
    navLinks.forEach(link => {
        if (link.getAttribute("href") === currentPath) {
            link.classList.add("active");
        }
    });

    const form = document.getElementById("bookingForm");
    const phoneInput = document.getElementById("phone");
    const statusMessage = document.getElementById("statusMessage");

    if (phoneInput) {
        phoneInput.addEventListener("input", () => {
            // Remove leading zero if user pastes/types standard local format after country code
            if (phoneInput.value.startsWith('0')) {
                phoneInput.value = phoneInput.value.replace(/^0/, "");
            }
        });
    }

    if (form) {
        form.addEventListener("submit", (event) => {
            event.preventDefault();

            const fnameInput = document.getElementById("fname").value.trim();
            const formattedName = fnameInput 
                ? fnameInput.charAt(0).toUpperCase() + fnameInput.slice(1).toLowerCase() 
                : "Valued Customer";

            statusMessage.style.display = "block";
            statusMessage.innerHTML = `Thank you, <strong>${formattedName}</strong>! Your visit request has been received successfully.
             We will contact you soon with scheduled visiting dates.`;

            form.reset();
        });
    }
});