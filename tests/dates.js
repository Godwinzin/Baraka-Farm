// YYYY-MM-DD in Nairobi, N days from now
export function isoDate(daysFromNow) {
  const d = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  return d.toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
}