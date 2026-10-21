const ALLOWED_COUNTRY_CODES = ["+254", "+256", "+255", "+250", "+1", "+44"];

// Turn anything into a trimmed string; non-strings become ""
const clean = (value) => (typeof value === "string" ? value.trim() : "");

const VISIT_TIMEZONE = "Africa/Nairobi";
const MAX_DAYS_AHEAD = 365;

// "Today" as YYYY-MM-DD in the farm's timezone (the server clock is UTC)
function todayIso(now) {
  return now.toLocaleDateString("en-CA", { timeZone: VISIT_TIMEZONE });
}

function addDaysIso(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Rejects wrong formats and impossible dates such as 2026-02-31
function isRealDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
}

export function validateBooking(body, now = new Date()) {
  const input = body ?? {};
  const errors = [];

  const data = {
    fname: clean(input.fname).toUpperCase(),
    sname: clean(input.sname).toUpperCase(),
    lname: clean(input.lname).toUpperCase(),
    countryCode: clean(input.countryCode),
    phone: clean(input.phone),
    email: clean(input.email),
    visitDate: clean(input.visitDate),
  };

  if (!data.fname) errors.push("First name is required.");
  else if (data.fname.length > 50) errors.push("First name is too long.");

  if (data.sname.length > 50) errors.push("Middle name is too long.");

  if (!data.lname) errors.push("Last name is required.");
  else if (data.lname.length > 50) errors.push("Last name is too long.");

  if (!ALLOWED_COUNTRY_CODES.includes(data.countryCode)) {
    errors.push("Please choose a valid country code.");
  }

  if (!/^\d{7,11}$/.test(data.phone)) {
    errors.push("Phone number must be 7 to 11 digits, numbers only.");
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push("Email address is not valid.");
  }

  if (!data.visitDate) {
    errors.push("Preferred visit date is required.");
  } else if (!isRealDate(data.visitDate)) {
    errors.push("Visit date is not a valid date.");
  } else if (data.visitDate < todayIso(now)) {
    errors.push("Visit date cannot be in the past.");
  } else if (data.visitDate > addDaysIso(todayIso(now), MAX_DAYS_AHEAD)) {
    errors.push("Visit date is too far ahead.");
  }

  return { errors, data };
}
export function validateNewPassword(currentPassword, newPassword) {
  const errors = [];

  if (typeof currentPassword !== "string" || currentPassword === "") {
    errors.push("Current password is required.");
  }

  if (typeof newPassword !== "string") {
    errors.push("New password is required.");
  } else {
    if (newPassword.length < 10) errors.push("New password must be at least 10 characters.");
    if (newPassword.length > 200) errors.push("New password is too long.");
    if (newPassword === currentPassword) errors.push("New password must be different from the current one.");
  }

  return errors;
}