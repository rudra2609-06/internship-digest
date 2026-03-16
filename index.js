import Anthropic from "@anthropic-ai/sdk";
import nodemailer from "nodemailer";

// ─── Config ───────────────────────────────────────────────────────────────────
const PROFILE = {
  skills: ["React", "Next.js", "HTML/CSS/JS", "Node.js"],
  location: "Surat, Gujarat",
  preference: "offline / in-person",
  year: "1st/2nd year college student",
  project: "Built a Next.js feedback app",
};

const SEARCH_QUERIES = [
  "Node.js internship Surat Gujarat 2025",
  "React frontend internship Surat Gujarat offline",
  "web developer internship Surat Gujarat fresher",
  "frontend developer intern Ahmedabad Gujarat 2025",
];

// ─── Search for internships via Claude + web search ───────────────────────────
async function searchInternships(client) {
  const prompt = `You are an internship finder assistant. Search the web using multiple queries and find REAL, currently open internship listings.

Student profile:
- Skills: ${PROFILE.skills.join(", ")}
- Location: ${PROFILE.location} (offline/in-person preferred, remote also okay)
- Level: ${PROFILE.year}
- Project: ${PROFILE.project}

Search for internships using these queries one by one:
${SEARCH_QUERIES.map((q, i) => `${i + 1}. "${q}"`).join("\n")}

For each real listing found, extract:
- Role/title
- Company name
- Location
- Stipend (if mentioned)
- Apply link or source URL
- Brief 1-line description

Return a JSON array of objects with fields: title, company, location, stipend, applyLink, description, source.
Return ONLY the JSON array. No markdown, no explanation. If fewer than 3 listings found, still return what you found.`;

  const response = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 2000,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  const clean = text.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("[");
  const end = clean.lastIndexOf("]");

  if (start === -1 || end === -1) {
    console.error("No JSON array found in response:", text);
    return [];
  }

  return JSON.parse(clean.slice(start, end + 1));
}

// ─── Build HTML email ─────────────────────────────────────────────────────────
function buildEmailHTML(listings) {
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const cards = listings
    .map(
      (l) => `
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;margin-bottom:14px;">
      <div style="font-size:16px;font-weight:600;color:#111827;">${l.title || "Web Dev Intern"}</div>
      <div style="font-size:14px;color:#6b7280;margin-top:3px;">${l.company || "Company"}</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;">
        ${l.location ? `<span style="font-size:12px;background:#EAF3DE;color:#3B6D11;padding:3px 9px;border-radius:6px;">${l.location}</span>` : ""}
        ${l.stipend ? `<span style="font-size:12px;background:#FAEEDA;color:#854F0B;padding:3px 9px;border-radius:6px;">${l.stipend}</span>` : ""}
        ${l.source ? `<span style="font-size:12px;background:#E6F1FB;color:#185FA5;padding:3px 9px;border-radius:6px;">${l.source}</span>` : ""}
      </div>
      ${l.description ? `<div style="font-size:13px;color:#374151;margin-top:10px;line-height:1.6;">${l.description}</div>` : ""}
      ${
        l.applyLink
          ? `<a href="${l.applyLink}" style="display:inline-block;margin-top:12px;font-size:13px;color:#185FA5;text-decoration:none;border-bottom:1px solid #85B7EB;">View & Apply →</a>`
          : ""
      }
    </div>
  `
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:32px auto;padding:0 16px;">

    <div style="background:#ffffff;border-radius:12px;padding:24px 28px;margin-bottom:16px;border:1px solid #e5e7eb;">
      <div style="font-size:20px;font-weight:600;color:#111827;">Internship digest</div>
      <div style="font-size:13px;color:#6b7280;margin-top:4px;">${today}</div>
      <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:6px;">
        <span style="font-size:12px;background:#E6F1FB;color:#0C447C;padding:3px 9px;border-radius:6px;">React / Next.js</span>
        <span style="font-size:12px;background:#E6F1FB;color:#0C447C;padding:3px 9px;border-radius:6px;">Node.js</span>
        <span style="font-size:12px;background:#EAF3DE;color:#3B6D11;padding:3px 9px;border-radius:6px;">Surat, Gujarat</span>
        <span style="font-size:12px;background:#FAEEDA;color:#854F0B;padding:3px 9px;border-radius:6px;">Offline preferred</span>
      </div>
    </div>

    <div style="font-size:13px;color:#6b7280;margin-bottom:10px;">${listings.length} listing${listings.length !== 1 ? "s" : ""} found today</div>

    ${cards}

    <div style="text-align:center;font-size:12px;color:#9ca3af;margin-top:24px;padding-bottom:24px;">
      Automated by Claude · Runs daily via GitHub Actions
    </div>
  </div>
</body>
</html>`;
}

// ─── Send email ───────────────────────────────────────────────────────────────
async function sendEmail(html, listingCount) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const today = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  await transporter.sendMail({
    from: `"Internship Digest" <${process.env.GMAIL_USER}>`,
    to: process.env.RECIPIENT_EMAIL,
    subject: `${listingCount} web dev internship${listingCount !== 1 ? "s" : ""} found · ${today}`,
    html,
  });

  console.log(`Email sent with ${listingCount} listings.`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("Starting internship search...");

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const listings = await searchInternships(client);
  console.log(`Found ${listings.length} listings.`);

  if (listings.length === 0) {
    console.log("No listings found today. Skipping email.");
    return;
  }

  const html = buildEmailHTML(listings);
  await sendEmail(html, listings.length);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
