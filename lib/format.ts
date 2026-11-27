const consultationTimeZone = "Australia/Sydney";

export function formatWhen(iso: string) {
  const date = new Date(iso);
  const day = new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: consultationTimeZone,
  }).format(date);
  const time = new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: consultationTimeZone,
  })
    .format(date)
    .replace("am", "AM")
    .replace("pm", "PM");

  return `${day} · ${time}`;
}
