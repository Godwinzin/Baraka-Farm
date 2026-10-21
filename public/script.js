document.addEventListener("DOMContentLoaded", () => {
   const mobileMenuBtn = document.getElementById("mobile-menu");
    const navLinksContainer = document.getElementById("nav-links");

    if (mobileMenuBtn && navLinksContainer) {
        // Toggle menu dropdown and X animation on click
        mobileMenuBtn.addEventListener("click", (event) => {
            event.stopPropagation(); // Prevent click from triggering document listener
            navLinksContainer.classList.toggle("active");
            mobileMenuBtn.classList.toggle("open");
        });

        // Close menu when clicking any link inside it
        navLinksContainer.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                navLinksContainer.classList.remove("active");
                mobileMenuBtn.classList.remove("open");
            });
        });

        // Close menu when clicking anywhere else on the page
        document.addEventListener("click", (event) => {
            if (!navLinksContainer.contains(event.target) && !mobileMenuBtn.contains(event.target)) {
                navLinksContainer.classList.remove("active");
                mobileMenuBtn.classList.remove("open");
            }
        });
    }
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
        // Wake the backend while the visitor fills in the form
        fetch("/api/health").catch(() => {});

        const visitDateInput = document.getElementById("visitDate");
        if (visitDateInput) {
            const now = new Date();
            const pad = (n) => String(n).padStart(2, "0");
            visitDateInput.min = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        }

        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            // 1. Collect the values from the form
           const booking = {
                fname: document.getElementById("fname").value.trim(),
                sname: document.getElementById("sname").value.trim(),
                lname: document.getElementById("lname").value.trim(),
                countryCode: document.getElementById("country-code").value,
                phone: phoneInput.value.trim(),
                email: document.getElementById("email").value.trim(),
                visitDate: document.getElementById("visitDate").value,
                website: document.getElementById("website").value, // honeypot
            };

            statusMessage.style.display = "block";
           statusMessage.textContent = "Sending your request...";
            const slowTimer = setTimeout(() => {
            statusMessage.textContent = "Still working. The server is waking up and can take up to a minute...";
            }, 5000);

            try {
                // 2. Send it to the server
                const response = await fetch("/api/bookings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(booking),
                });

                if (response.status === 400) {
                    const result = await response.json();
                    statusMessage.textContent = result.errors.join(" ");
                    return;
                }

                if (response.status === 429) {
                    statusMessage.textContent = "Too many attempts. Please wait a few minutes and try again.";
                    return;
                }

                // 3. Check whether the server accepted it
                if (!response.ok) {
                    throw new Error("The server rejected the booking");
                }

                // 4. Show success
                const name = booking.fname.charAt(0).toUpperCase() + booking.fname.slice(1).toLowerCase();
                const strong = document.createElement("strong");
                strong.textContent = name;

                statusMessage.textContent = "";
                statusMessage.append(
                    "Thank you, ",
                    strong,
                    "! Your visit request has been received successfully. We will contact you soon with scheduled visiting dates."
                );

                form.reset();
            } catch (error) {
                // 5. Show failure
                statusMessage.textContent = "Sorry, something went wrong. Please try again.";
                console.error(error);
            }
            finally {
                clearTimeout(slowTimer);
            }
        });
    }
   const galleryGrid = document.getElementById("galleryGrid");
    if (galleryGrid) {
        const galleryData = [
            { src: "Images/Maize_farm1.jpg", alt: "Maize Field" },
            { src: "Images/maizefarm2.png", alt: "Growing Maize" },
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