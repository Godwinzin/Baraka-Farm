const ALLOWED_COUNTRY_CODES = ["+254", "+256", "+255", "+250", "+1", "+44"];

// Turn anything into a trimmed string; non-strings become ""
const clean = (value) => (typeof value === "string" ? value.trim() : "");

export function validateBooking(body) {
  const input = body ?? {};
  const errors = [];

  const data = {
    fname: clean(input.fname),
    sname: clean(input.sname),
    lname: clean(input.lname),
    countryCode: clean(input.countryCode),
    phone: clean(input.phone),
    email: clean(input.email),
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