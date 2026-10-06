const fs = require("fs");
const path = require("path");

const productsDir = path.join(__dirname, "..", "public", "products");
if (!fs.existsSync(productsDir)) {
  fs.mkdirSync(productsDir, { recursive: true });
}

// Helper to create official 3:4 (width: 300, height: 400) SVG Gift Cards
function createOfficialCardSvg({
  brandName,
  subTitle,
  tagText = "OFFICIAL DIGITAL CARD",
  bgColor1,
  bgColor2,
  accentColor,
  logoSvg,
  watermarkSvg = "",
  currencyBadge = "",
}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" width="300" height="400">
  <defs>
    <!-- Main Gradient Background -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bgColor1}" />
      <stop offset="100%" stop-color="${bgColor2}" />
    </linearGradient>

    <!-- Metallic Edge Shimmer -->
    <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.8" />
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.3" />
      <stop offset="100%" stop-color="${accentColor}" stop-opacity="0.4" />
    </linearGradient>

    <!-- Card Inner Glow -->
    <linearGradient id="glowGrad" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.15" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.5" />
    </linearGradient>
  </defs>

  <!-- Card Background with Outer Border & Shadow -->
  <rect x="4" y="4" width="292" height="392" rx="20" ry="20" fill="url(#bgGrad)" stroke="url(#edgeGrad)" stroke-width="2.5" />
  <rect x="6" y="6" width="288" height="388" rx="18" ry="18" fill="url(#glowGrad)" />

  <!-- Background Watermark -->
  <g opacity="0.08" transform="translate(150, 200) scale(1.8)">
    ${watermarkSvg || logoSvg}
  </g>

  <!-- Top Header Ribbon / Tag -->
  <rect x="24" y="24" width="252" height="24" rx="6" fill="#000000" fill-opacity="0.4" stroke="${accentColor}" stroke-opacity="0.3" stroke-width="1" />
  <text x="150" y="40" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="800" fill="${accentColor}" text-anchor="middle" letter-spacing="2">
    ${tagText}
  </text>

  <!-- Center Logo & Emblem Area -->
  <g transform="translate(150, 175)">
    <!-- Glow Ring -->
    <circle cx="0" cy="0" r="55" fill="${accentColor}" fill-opacity="0.15" />
    <circle cx="0" cy="0" r="46" fill="#000000" fill-opacity="0.5" stroke="${accentColor}" stroke-opacity="0.4" stroke-width="1.5" />
    <!-- Logo SVG -->
    <g transform="translate(-30, -30) scale(0.6)">
      ${logoSvg}
    </g>
  </g>

  <!-- Currency / Country Badge if present -->
  ${
    currencyBadge
      ? `<g transform="translate(220, 70)">
          <rect x="-30" y="-12" width="60" height="24" rx="12" fill="${accentColor}" fill-opacity="0.9" />
          <text x="0" y="4" font-family="sans-serif" font-size="11" font-weight="900" fill="#000000" text-anchor="middle">${currencyBadge}</text>
        </g>`
      : ""
  }

  <!-- Bottom Brand Title & Subtitle Section -->
  <rect x="16" y="295" width="268" height="84" rx="14" fill="#0d1117" fill-opacity="0.85" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1" />
  
  <text x="150" y="330" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="17" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="0.5">
    ${brandName}
  </text>
  
  <text x="150" y="354" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" fill="${accentColor}" text-anchor="middle">
    ${subTitle}
  </text>

  <!-- Security Hologram Bar at bottom -->
  <line x1="40" y1="368" x2="260" y2="368" stroke="url(#edgeGrad)" stroke-width="1.5" stroke-dasharray="8 4" opacity="0.6" />
</svg>`;
}

// SVG Logos
const LOGOS = {
  steam: `<path fill="#ffffff" d="M50 0C22.4 0 0 22.4 0 50c0 23.4 16.1 43.1 38 48.4l14.4-20.6c-1.4-1.3-2.4-3.1-2.4-5.2 0-4.1 3.4-7.5 7.5-7.5 1.5 0 2.9.4 4.1 1.2l14.2-10.2C75.2 54.3 75 52.2 75 50c0-13.8 11.2-25 25-25s25 11.2 25 25-11.2 25-25 25c-1.1 0-2.2-.1-3.3-.2l-10.4 14.8c1.3.3 2.7.4 4.1.4 13.8 0 25-11.2 25-25S103.8 25 90 25s-25 11.2-25 25c0 .6.1 1.3.2 1.9L51.8 61.8C49.9 60.7 47.5 60 45 60c-8.3 0-15 6.7-15 15 0 1.9.4 3.7 1.1 5.3L16 93.6C25.4 97.7 35.9 100 47 100c27.6 0 50-22.4 50-50S77.6 0 50 0z"/>`,
  playstation: `<path fill="#ffffff" d="M58.4 20.3c-7.8-2.8-16.4-1.8-22.8 2.6-7.8 5.3-11.3 14.3-9.1 23.1 1.8 7.3 7.8 12.9 15.3 14.4 2.6.5 5.3.4 7.9-.2V21l8.7-.7v48.4c-4.4 1.3-9 1.7-13.6 1.1-12.7-1.7-22.9-11.1-25.2-23.7-2.7-14.7 3.3-29.4 15.4-37.4 11.1-7.3 25.5-8 37.3-1.8l-13.9 13.4zM70 12l25 8.3-25 7.8v-16.1z"/>`,
  googlePlay: `<path fill="#00e676" d="M10 5l45 45L10 95V5z"/><path fill="#ffb300" d="M55 50L10 95l60-35-15-10z"/><path fill="#ff3d00" d="M70 40L10 5l45 45 15-10z"/><path fill="#0288d1" d="M70 40l15 10-15 10 10-10-10-10z"/>`,
  roblox: `<rect x="15" y="15" width="70" height="70" rx="12" fill="#ffffff" transform="rotate(-15 50 50)"/><rect x="35" y="35" width="30" height="30" rx="4" fill="#111827" transform="rotate(-15 50 50)"/>`,
  telegram: `<path fill="#ffffff" d="M85.4 15.6L12.3 43.8c-5 2-4.9 4.8-.9 6.1l18.7 5.8 43.4-27.4c2.1-1.3 3.9-.6 2.4.8L40.8 62.4l-1.4 20.1c2 0 2.9-.9 4-2l9.6-9.3 20 14.7c3.7 2 6.3 1 7.3-3.4l13.1-61.9c1.3-5.3-2-7.7-8-5.0z"/>`,
  nintendo: `<rect x="5" y="20" width="90" height="60" rx="30" fill="none" stroke="#ffffff" stroke-width="8"/><circle cx="32" cy="50" r="12" fill="#ffffff"/><circle cx="68" cy="50" r="8" fill="none" stroke="#ffffff" stroke-width="6"/>`,
  tinder: `<path fill="#ff4458" d="M50 5c-6.8 11.2-18.4 24.2-18.4 39.8 0 16.5 13.4 29.8 29.8 29.8 14.5 0 26.5-10.3 29.2-24.1C91.9 66.8 77 78 60 78c-15.5 0-28-12.5-28-28 0-14.8 10.8-27.2 25.1-29.4C53.7 15.3 50 5 50 5z"/>`,
  imo: `<circle cx="50" cy="50" r="40" fill="#0084ff"/><text x="50" y="58" font-family="sans-serif" font-size="28" font-weight="900" fill="#ffffff" text-anchor="middle">imo</text>`,
};

const CARDS = [
  {
    filename: "tinder.svg",
    brandName: "TINDER VOUCHER",
    subTitle: "PLUS & GOLD (GLOBAL)",
    tagText: "OFFICIAL TINDER CARD",
    bgColor1: "#e11d48",
    bgColor2: "#881337",
    accentColor: "#fda4af",
    logoSvg: LOGOS.tinder,
    currencyBadge: "GOLD",
  },
  {
    filename: "imo-diamonds.svg",
    brandName: "IMO DIAMONDS",
    subTitle: "DIRECT PLAYER TOPUP",
    tagText: "OFFICIAL IMO TOPUP",
    bgColor1: "#0284c7",
    bgColor2: "#075985",
    accentColor: "#38bdf8",
    logoSvg: LOGOS.imo,
    currencyBadge: "IMO",
  },
  {
    filename: "imo-gift-card.svg",
    brandName: "IMO GIFT CARD",
    subTitle: "USD BALANCE CODE",
    tagText: "OFFICIAL IMO CARD",
    bgColor1: "#0369a1",
    bgColor2: "#0c4a6e",
    accentColor: "#7dd3fc",
    logoSvg: LOGOS.imo,
    currencyBadge: "USD $",
  },
  {
    filename: "steam-wallet-global.svg",
    brandName: "STEAM WALLET",
    subTitle: "GLOBAL DIGITAL CARD",
    tagText: "OFFICIAL STEAM CARD",
    bgColor1: "#171a21",
    bgColor2: "#1b2838",
    accentColor: "#66c0f4",
    logoSvg: LOGOS.steam,
    currencyBadge: "GLOBAL",
  },
  {
    filename: "steam-wallet-us.svg",
    brandName: "STEAM WALLET",
    subTitle: "UNITED STATES (USD)",
    tagText: "OFFICIAL STEAM CARD",
    bgColor1: "#171a21",
    bgColor2: "#0e1a2b",
    accentColor: "#38bdf8",
    logoSvg: LOGOS.steam,
    currencyBadge: "USD $",
  },
  {
    filename: "steam-wallet-tr.svg",
    brandName: "STEAM WALLET",
    subTitle: "TURKEY REGION (TL)",
    tagText: "OFFICIAL STEAM CARD",
    bgColor1: "#1a0f13",
    bgColor2: "#2d1219",
    accentColor: "#f43f5e",
    logoSvg: LOGOS.steam,
    currencyBadge: "TL ₺",
  },
  {
    filename: "playstation-us.svg",
    brandName: "PLAYSTATION STORE",
    subTitle: "PSN WALLET CARD (US)",
    tagText: "OFFICIAL PLAYSTATION CARD",
    bgColor1: "#003791",
    bgColor2: "#001238",
    accentColor: "#60a5fa",
    logoSvg: LOGOS.playstation,
    currencyBadge: "PSN US",
  },
  {
    filename: "google-play-us.svg",
    brandName: "GOOGLE PLAY",
    subTitle: "GIFT CARD (US REGION)",
    tagText: "OFFICIAL GOOGLE PLAY",
    bgColor1: "#0f172a",
    bgColor2: "#1e293b",
    accentColor: "#34d399",
    logoSvg: LOGOS.googlePlay,
    currencyBadge: "USD $",
  },
  {
    filename: "google-play-tr.svg",
    brandName: "GOOGLE PLAY",
    subTitle: "TURKEY REGION (TRY)",
    tagText: "OFFICIAL GOOGLE PLAY",
    bgColor1: "#1f190e",
    bgColor2: "#3b2a1a",
    accentColor: "#fbbf24",
    logoSvg: LOGOS.googlePlay,
    currencyBadge: "TRY ₺",
  },
  {
    filename: "roblox-global.svg",
    brandName: "ROBLOX CARD",
    subTitle: "GLOBAL DIGITAL CODE",
    tagText: "OFFICIAL ROBLOX CARD",
    bgColor1: "#09090b",
    bgColor2: "#18181b",
    accentColor: "#a1a1aa",
    logoSvg: LOGOS.roblox,
    currencyBadge: "ROBLOX",
  },
  {
    filename: "roblox-robux-us.svg",
    brandName: "ROBUX CARD",
    subTitle: "ROBLOX DIGITAL ROBUX",
    tagText: "OFFICIAL ROBUX CARD",
    bgColor1: "#1c1917",
    bgColor2: "#292524",
    accentColor: "#fbbf24",
    logoSvg: LOGOS.roblox,
    currencyBadge: "R$ US",
  },
  {
    filename: "telegram-stars.svg",
    brandName: "TELEGRAM STARS",
    subTitle: "INSTANT STARS TOPUP",
    tagText: "OFFICIAL TELEGRAM CARD",
    bgColor1: "#075985",
    bgColor2: "#0c4a6e",
    accentColor: "#38bdf8",
    logoSvg: LOGOS.telegram,
    currencyBadge: "STARS",
  },
  {
    filename: "telegram-premium.svg",
    brandName: "TELEGRAM PREMIUM",
    subTitle: "DIGITAL SUBSCRIPTION",
    tagText: "OFFICIAL TELEGRAM CARD",
    bgColor1: "#4c1d95",
    bgColor2: "#2e1065",
    accentColor: "#a78bfa",
    logoSvg: LOGOS.telegram,
    currencyBadge: "PREMIUM",
  },
  {
    filename: "nintendo-us.svg",
    brandName: "NINTENDO eSHOP",
    subTitle: "NINTENDO SWITCH (US)",
    tagText: "OFFICIAL NINTENDO CARD",
    bgColor1: "#991b1b",
    bgColor2: "#450a0a",
    accentColor: "#f87171",
    logoSvg: LOGOS.nintendo,
    currencyBadge: "eSHOP",
  },
];

CARDS.forEach((c) => {
  const xml = createOfficialCardSvg(c);
  const filePath = path.join(productsDir, c.filename);
  fs.writeFileSync(filePath, xml, "utf8");
  // Also save a .png copy filename alias just in case
  const pngAliasPath = path.join(productsDir, c.filename.replace(".svg", ".png"));
  fs.writeFileSync(pngAliasPath, xml, "utf8");
  console.log(`Generated official card SVG: ${c.filename}`);
});

console.log("All 11 official gift card SVGs generated successfully!");
