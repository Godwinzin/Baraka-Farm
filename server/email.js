const API_URL = "https://api.resend.com/emails";

export async function sendBookingNotification(booking, id) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL;

  // No credentials configured (for example on a fresh setup): skip quietly
  if (!apiKey || !to) {
    console.log("Email skipped: RESEND_API_KEY or NOTIFY_EMAIL is not set");
    return;
  }

  const fullName = [booking.fname, booking.sname, booking.lname]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ");

  const text = [
    "A new visit request was received.",
    "",
    `Booking #${id}`,
    `Name: ${fullName}`,
    `Phone: ${booking.countryCode}${booking.phone}`,
    `Email: ${booking.email || "(not given)"}`,
    `Preferred visit date: ${booking.visitDate}`,
    "",
    "Open the admin page to manage it.",
  ].join("\n");

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Baraka Farm <onboarding@resend.dev>",
      to: [to],
      subject: `New visit request: ${fullName}`,
      text,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Email provider replied ${response.status}: ${await response.text()}`);
  }
}