import { GoogleGenerativeAI } from "@google/generative-ai";
import nodemailer from "nodemailer";

// ─── Config ───────────────────────────────────────────────────────────────────
const PROFILE = {
  skills: ["React", "Next.js", "HTML/CSS/JS", "Node.js"],
  location: "Surat, Gujarat",
  preference: "offline / in-person",
  year: "1st/2nd year college student",
  project: "Built a Next.js feedback app",
};

// ─── Search for internships via Gemini + Google Search grounding ──────────────
async function searchInternships() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    tools: [{ googleSearch: {} }],
  });

  const prompt = `Search the web and find REAL, currently open internship listings for this student:

Student profile:
- Skills: ${PROFILE.skills.join(", ")}
- Location: ${PROFILE.location} (offline/in-person preferred, remote also okay)
- Level: ${PROFILE.year}
- Project: ${PROFILE.project}

Search for:
1. "web development internship Surat Gujarat 2025"
2. "React frontend internship Gujarat offline fresher"
3. "Node.js internship Surat Ahmedabad 2025"
4. "frontend developer intern Gujarat stipend"

Return ONLY a JSON array of the best 4-6 listings found. Each object must have:
- title: job title
- company: company name
- location: city
- stipend: monthly stipend or null
- applyLink: URL to apply or null
- description: 1 sentence about the role
- source: where you found it (e.g. Internshala, LinkedIn)

Return ONLY the raw JSON array. No markdown, no explanation, no backticks.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const clean = text.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("[");
  const end = clean.lastIndexOf("]");

  if (start === -1 || end === -1) {
    console.error("No JSON found in response:", text);
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
      ${l.applyLink ? `<a href="${l.applyLink}" style="display:inline-block;margin-top:12px;font-size:13px;color:#185FA5;text-decoration:none;border-bottom:1px solid #85B7EB;">View & Apply →</a>` : ""}
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
      Automated by Gemini · Runs daily via GitHub Actions
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
  console.log("Starting internship search with Gemini...");

  const listings = await searchInternships();
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
