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
   const galleryGrid = document.getElementById("galleryGrid");
    if (galleryGrid) {
        const galleryData = [
            { src: "Images/Maize_farm1.jpg", alt: "Maize Field" },
            { src: "Images/Maizefarm2.png", alt: "Growing Maize" },
            { src: "Images/cabbage 1.jpg", alt: "Cabbage Patch" },
            { src: "Images/cabbage 2.jpg", alt: "Fresh Cabbages" },
            { src: "Images/Machine-Cabbage-Harvesting.jpg", alt: "Machine harvesting Cabbages" },
            { src: "Images/mango 3.jpg", alt: "Mangoes Farm" },
            { src: "Images/mango-plant.webp", alt: "Mangoes Farm" },
            { src: "Images/tomato farm2.jpg", alt: "Tomato Greenhouse" },
            { src: "Images/tomato farm 3.jpg", alt: "Tomato Farm" },
            { src: "Images/tomato tomato.jpg", alt: "Tomato Farm" },
            { src: "Images/dairy 2.jpg", alt: "Dairy Farm" },
            { src: "Images/dairy 3.png", alt: "Dairy Farm" },
            { src: "Images/Dairy-cows.jpg", alt: "Dairy Cows" },
            { src: "Images/Onions nets.webp", alt: "Onion Harvest" },
            { src: "Images/onionfarm.jpg", alt: "Onion Farm" }
        ];

        galleryGrid.innerHTML = galleryData.map(item => `
            <div class="gallery-item">
                <img src="${item.src}" alt="${item.alt}" loading="lazy">
            </div>
        `).join("");
    } 
});