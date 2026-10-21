import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { validateBooking, validateNewPassword } from "../server/validate.js";

const validBooking = {
  fname: "john",
  lname: "smith",
  countryCode: "+254",
  phone: "712345678",
};

describe("validateBooking", () => {
  test("accepts a minimal valid booking", () => {
    const { errors } = validateBooking(validBooking);
    assert.deepEqual(errors, []);
  });

  test("converts names to uppercase", () => {
    const { data } = validateBooking({ ...validBooking, fname: "mIkE", sname: "otieno" });
    assert.equal(data.fname, "MIKE");
    assert.equal(data.sname, "OTIENO");
    assert.equal(data.lname, "SMITH");
  });

  test("trims whitespace around values", () => {
    const { data } = validateBooking({ ...validBooking, fname: "  john  " });
    assert.equal(data.fname, "JOHN");
  });

  test("requires a first name", () => {
    const { errors } = validateBooking({ ...validBooking, fname: "" });
    assert.ok(errors.includes("First name is required."));
  });

  test("requires a last name", () => {
    const { errors } = validateBooking({ ...validBooking, lname: "" });
    assert.ok(errors.includes("Last name is required."));
  });

  test("treats a non-string first name as missing", () => {
    const { errors } = validateBooking({ ...validBooking, fname: 123 });
    assert.ok(errors.includes("First name is required."));
  });

  test("rejects names longer than 50 characters", () => {
    const { errors } = validateBooking({ ...validBooking, fname: "a".repeat(51) });
    assert.ok(errors.includes("First name is too long."));
  });

  test("rejects a country code that is not in the list", () => {
    const { errors } = validateBooking({ ...validBooking, countryCode: "+999" });
    assert.ok(errors.includes("Please choose a valid country code."));
  });

  test("rejects a phone number containing letters", () => {
    const { errors } = validateBooking({ ...validBooking, phone: "abc" });
    assert.ok(errors.includes("Phone number must be 7 to 11 digits, numbers only."));
  });

  test("rejects a phone number that is too short", () => {
    const { errors } = validateBooking({ ...validBooking, phone: "12345" });
    assert.ok(errors.includes("Phone number must be 7 to 11 digits, numbers only."));
  });

  test("accepts a booking without an email", () => {
    const { errors } = validateBooking({ ...validBooking, email: "" });
    assert.deepEqual(errors, []);
  });

  test("accepts a valid email", () => {
    const { errors } = validateBooking({ ...validBooking, email: "mike@example.com" });
    assert.deepEqual(errors, []);
  });

  test("rejects a malformed email", () => {
    const { errors } = validateBooking({ ...validBooking, email: "nope" });
    assert.ok(errors.includes("Email address is not valid."));
  });

  test("reports every problem at once", () => {
    const { errors } = validateBooking({});
    assert.equal(errors.length, 4);
  });

  test("does not crash when there is no body at all", () => {
    const { errors } = validateBooking(undefined);
    assert.ok(errors.length > 0);
  });
});

describe("validateNewPassword", () => {
  test("accepts a valid change", () => {
    const errors = validateNewPassword("old-password-123", "new-password-456");
    assert.deepEqual(errors, []);
  });

  test("requires the current password", () => {
    const errors = validateNewPassword("", "new-password-456");
    assert.ok(errors.includes("Current password is required."));
  });

  test("rejects a new password under 10 characters", () => {
    const errors = validateNewPassword("old-password-123", "short");
    assert.ok(errors.includes("New password must be at least 10 characters."));
  });

  test("rejects a new password over 200 characters", () => {
    const errors = validateNewPassword("old-password-123", "a".repeat(201));
    assert.ok(errors.includes("New password is too long."));
  });

  test("rejects a new password equal to the current one", () => {
    const errors = validateNewPassword("same-password-123", "same-password-123");
    assert.ok(errors.includes("New password must be different from the current one."));
  });

  test("rejects a non-string new password", () => {
    const errors = validateNewPassword("old-password-123", 12345678901);
    assert.ok(errors.includes("New password is required."));
  });
});