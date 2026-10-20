const STATUSES = ["new", "contacted", "confirmed", "cancelled"];

const loginForm = document.getElementById("loginForm");
const logoutBtn = document.getElementById("logoutBtn");
const passwordSection = document.getElementById("passwordSection");
const passwordForm = document.getElementById("passwordForm");
const passwordMessage = document.getElementById("passwordMessage");

function showLoggedIn(loggedIn) {
  loginForm.hidden = loggedIn;
  logoutBtn.hidden = !loggedIn;
  passwordSection.hidden = !loggedIn;

  if (!loggedIn) {
    tbody.replaceChildren();
    passwordForm.reset();
    passwordMessage.textContent = "";
  }
}
const message = document.getElementById("adminMessage");
const tbody = document.querySelector("#bookingsTable tbody");


// One helper that adds the key header and checks the response
async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json" },
  });

  if (response.status === 401) {
    showLoggedIn(false);
    throw new Error("Please log in.");
  }
  if (response.status === 429) throw new Error("Too many attempts. Try again later.");
  if (!response.ok) throw new Error(`Request failed (${response.status}).`);

  return response.status === 204 ? null : response.json();
}

function cell(text) {
  const td = document.createElement("td");
  td.textContent = text ?? "";
  return td;
}

function renderBookings(bookings) {
  const rows = bookings.map((b) => {
    const tr = document.createElement("tr");

    const fullName = [b.fname, b.sname, b.lname].filter(Boolean).join(" ");
    tr.append(
      cell(b.id),
      cell(fullName),
      cell(`${b.country_code}${b.phone}`),
      cell(b.email),
      cell(new Date(b.created_at).toLocaleString())
    );

    // Status dropdown
    const select = document.createElement("select");
    STATUSES.forEach((s) => {
      const option = document.createElement("option");
      option.value = s;
      option.textContent = s;
      select.append(option);
    });
    select.value = b.status;
    select.addEventListener("change", async () => {
      try {
        await api(`/api/bookings/${b.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: select.value }),
        });
      } catch (error) {
        message.textContent = error.message;
        loadBookings();
      }
    });
    const statusTd = document.createElement("td");
    statusTd.append(select);

    // Delete button
    const del = document.createElement("button");
    del.textContent = "Delete";
    del.addEventListener("click", async () => {
      if (!confirm(`Delete the booking from ${fullName}? This cannot be undone.`)) return;
      try {
        await api(`/api/bookings/${b.id}`, { method: "DELETE" });
        loadBookings();
      } catch (error) {
        message.textContent = error.message;
      }
    });
    const delTd = document.createElement("td");
    delTd.append(del);

    tr.append(statusTd, delTd);
    return tr;
  });

  tbody.replaceChildren(...rows);
}

passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (newPassword !== confirmPassword) {
    passwordMessage.textContent = "The new passwords do not match.";
    return;
  }

  try {
    const response = await fetch("/api/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (response.status === 401) {
      showLoggedIn(false);
      message.textContent = "Please log in.";
      return;
    }
    if (response.status === 429) {
      passwordMessage.textContent = "Too many attempts. Try again later.";
      return;
    }
    if (response.status === 400 || response.status === 403) {
      const result = await response.json();
      passwordMessage.textContent = result.errors ? result.errors.join(" ") : result.error;
      return;
    }
    if (!response.ok) throw new Error("Request failed");

    passwordForm.reset();
    passwordMessage.textContent = "Password changed. Other devices have been logged out.";
  } catch (error) {
    passwordMessage.textContent = "Could not change the password. Please try again.";
  }
});

async function loadBookings() {
  message.textContent = "Loading bookings...";
  try {
    const bookings = await api("/api/bookings");
    showLoggedIn(true);
    renderBookings(bookings);
    message.textContent = `${bookings.length} booking(s)`;
  } catch (error) {
    tbody.replaceChildren();
    message.textContent = error.message;
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: document.getElementById("username").value,
        password: document.getElementById("password").value,
      }),
    });

    if (response.status === 401) {
      message.textContent = "Wrong username or password.";
      return;
    }
    if (response.status === 429) {
      message.textContent = "Too many attempts. Try again later.";
      return;
    }
    if (!response.ok) throw new Error("Login failed");

    loginForm.reset();
    loadBookings();
  } catch (error) {
    message.textContent = "Could not log in. Please try again.";
  }
});

logoutBtn.addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST" });
  showLoggedIn(false);
  message.textContent = "Logged out.";
});

// If a valid session cookie already exists, show the bookings straight away
loadBookings();