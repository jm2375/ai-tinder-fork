// app.js
// Plain global JS, no modules.

// -------------------
// Backend API
// -------------------
const API_BASE = "http://localhost:3000";

async function postDecision(profileId, decision, profile) {
  try {
    const res = await fetch(`${API_BASE}/api/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, decision, profile }),
    });
    return await res.json();
  } catch {
    // Server offline — fail silently, UI still works
    return null;
  }
}

// -------------------
// Data generator
// -------------------
const TAGS = [
  "Coffee","Hiking","Movies","Live Music","Board Games","Cats","Dogs","Traveler",
  "Foodie","Tech","Art","Runner","Climbing","Books","Yoga","Photography"
];
const FIRST_NAMES = [
  "Alex","Sam","Jordan","Taylor","Casey","Avery","Riley","Morgan","Quinn","Cameron",
  "Jamie","Drew","Parker","Reese","Emerson","Rowan","Shawn","Harper","Skyler","Devon"
];
const CITIES = [
  "Brooklyn","Manhattan","Queens","Jersey City","Hoboken","Astoria",
  "Williamsburg","Bushwick","Harlem","Lower East Side"
];
const JOBS = [
  "Product Designer","Software Engineer","Data Analyst","Barista","Teacher",
  "Photographer","Architect","Chef","Nurse","Marketing Manager","UX Researcher"
];
const BIOS = [
  "Weekend hikes and weekday lattes.",
  "Dog parent. Amateur chef. Karaoke enthusiast.",
  "Trying every taco in the city — for science.",
  "Bookstore browser and movie quote machine.",
  "Gym sometimes, Netflix always.",
  "Looking for the best slice in town.",
  "Will beat you at Mario Kart.",
  "Currently planning the next trip."
];

const UNSPLASH_SEEDS = [
  "1515462277126-2b47b9fa09e6",
  "1520975916090-3105956dac38",
  "1519340241574-2cec6aef0c01",
  "1554151228-14d9def656e4",
  "1548142813-c348350df52b",
  "1517841905240-472988babdf9",
  "1535713875002-d1d0cf377fde",
  "1545996124-0501ebae84d0",
  "1524504388940-b1c1722653e1",
  "1531123897727-8f129e1688ce",
];

function sample(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickTags() { return Array.from(new Set(Array.from({length:4}, ()=>sample(TAGS)))); }
function imgFor(seed) {
  return `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=1200&q=80`;
}

function generateProfiles(count = 12) {
  const profiles = [];
  for (let i = 0; i < count; i++) {
    // Pick 2-4 unique photos per profile
    const shuffled = [...UNSPLASH_SEEDS].sort(() => Math.random() - 0.5);
    const photoCount = 2 + Math.floor(Math.random() * 3); // 2, 3, or 4
    const photos = shuffled.slice(0, photoCount).map(imgFor);
    profiles.push({
      id: `p_${i}_${Date.now().toString(36)}`,
      name: sample(FIRST_NAMES),
      age: 18 + Math.floor(Math.random() * 22),
      city: sample(CITIES),
      title: sample(JOBS),
      bio: sample(BIOS),
      tags: pickTags(),
      photos,
    });
  }
  return profiles;
}

// -------------------
// UI rendering
// -------------------
const deckEl = document.getElementById("deck");
const shuffleBtn = document.getElementById("shuffleBtn");
const likeBtn = document.getElementById("likeBtn");
const nopeBtn = document.getElementById("nopeBtn");
const superLikeBtn = document.getElementById("superLikeBtn");

let profiles = [];

function renderDeck() {
  deckEl.setAttribute("aria-busy", "true");
  deckEl.innerHTML = "";

  profiles.forEach((p) => {
    const card = document.createElement("article");
    card.className = "card";
    card.setAttribute("data-photos", JSON.stringify(p.photos));
    card.setAttribute("data-photo-idx", "0");
    card.setAttribute("data-profile-id", p.id);
    card.setAttribute("data-profile", JSON.stringify({ id: p.id, name: p.name, age: p.age, city: p.city, title: p.title }));

    const img = document.createElement("img");
    img.className = "card__media";
    img.src = p.photos[0];
    img.alt = `${p.name} — profile photo`;

    const body = document.createElement("div");
    body.className = "card__body";

    const titleRow = document.createElement("div");
    titleRow.className = "title-row";
    titleRow.innerHTML = `
      <h2 class="card__title">${p.name}</h2>
      <span class="card__age">${p.age}</span>
    `;

    const meta = document.createElement("div");
    meta.className = "card__meta";
    meta.textContent = `${p.title} • ${p.city}`;

    const chips = document.createElement("div");
    chips.className = "card__chips";
    p.tags.forEach((t) => {
      const c = document.createElement("span");
      c.className = "chip";
      c.textContent = t;
      chips.appendChild(c);
    });

    body.appendChild(titleRow);
    body.appendChild(meta);
    body.appendChild(chips);

    card.appendChild(img);
    card.appendChild(body);

    deckEl.appendChild(card);
  });

  deckEl.removeAttribute("aria-busy");
}

function resetDeck() {
  profiles = generateProfiles(12);
  renderDeck();
}

shuffleBtn.addEventListener("click", resetDeck);

// Boot
resetDeck();

// -------------------
// Match toast
// -------------------
function showMatchToast(name) {
  let toast = document.getElementById("matchToast");
  if (!toast) return;
  toast.textContent = name ? `🔥 It's a Match with ${name}!` : "🔥 It's a Match!";
  // Reset so re-triggering works
  toast.classList.remove("match-toast--visible");
  void toast.offsetWidth; // reflow
  toast.classList.add("match-toast--visible");
  setTimeout(() => toast.classList.remove("match-toast--visible"), 2200);
}

// -------------------
// Poll backend every 10s for incoming matches
// -------------------
async function pollForMatches() {
  try {
    const res = await fetch(`${API_BASE}/api/matches/poll`);
    const data = await res.json();
    if (data.matches && data.matches.length > 0) {
      data.matches.forEach((match, i) => {
        setTimeout(() => showMatchToast(match.profile?.name), i * 2400);
      });
    }
  } catch { /* server offline — silent */ }
}

setInterval(pollForMatches, 10000);

// ===============================
// INTERACTIONS: swipe + buttons + double-tap
// ===============================
(function setupTinderInteractions() {
  const SWIPE_X_THRESHOLD = 90;
  const SWIPE_Y_THRESHOLD = 90;
  const ROTATE_DEG = 12;
  const EXIT_MULT = 1.25;

  // Live collection of all card elements; updated automatically as the DOM changes.
  const cardElements = document.getElementsByClassName("card");

  function getTopCard() {
    if (!cardElements || cardElements.length === 0) return null;
    return cardElements[cardElements.length - 1];
  }

  function nextPhoto(card) {
    if (!card) return;

    const img = card.querySelector("img");
    if (!img) return;

    const raw = card.getAttribute("data-photos");
    if (!raw) return;

    let photos;
    try { photos = JSON.parse(raw); } catch { return; }
    if (!Array.isArray(photos) || photos.length === 0) return;

    const idx = Number(card.getAttribute("data-photo-idx") || "0");
    const nextIdx = (idx + 1) % photos.length;
    card.setAttribute("data-photo-idx", String(nextIdx));
    img.src = photos[nextIdx];
  }

  function animateDecision(card, decision) {
    if (!card) return;

    const profileId = card.getAttribute("data-profile-id") || "";
    let profile = null;
    try { profile = JSON.parse(card.getAttribute("data-profile") || "null"); } catch { /* ignore */ }

    const outX =
      decision === "like"  ? window.innerWidth  :
      decision === "nope"  ? -window.innerWidth  :
      0;
    const outY =
      decision === "superlike" ? -window.innerHeight : 0;
    const rotate =
      decision === "like" ?  ROTATE_DEG :
      decision === "nope" ? -ROTATE_DEG :
      0;

    card.style.transition = "transform 260ms ease";
    card.style.transform =
      `translate(${outX * EXIT_MULT}px, ${outY * EXIT_MULT}px) rotate(${rotate}deg)`;

    // Post to backend; on superlike always show match toast, on like use server response
    postDecision(profileId, decision, profile).then((data) => {
      if (data && data.matched) showMatchToast(profile?.name);
    });
    // For superlike, show toast immediately without waiting for network
    if (decision === "superlike") showMatchToast(profile?.name);

    setTimeout(() => card.remove(), 260);
  }

  // Gesture state
  let startX = 0, startY = 0;
  let dx = 0, dy = 0;
  let dragging = false;

  // Double-tap detection
  let lastTapTime = 0;
  const DOUBLE_TAP_MS = 320;

  function onPointerDown(e) {
    const card = getTopCard();
    if (!card || !card.contains(e.target)) return;

    dragging = true;
    dx = 0; dy = 0;
    card.setPointerCapture?.(e.pointerId);
    startX = e.clientX;
    startY = e.clientY;
    card.style.transition = "none";

    const now = Date.now();
    if (now - lastTapTime < DOUBLE_TAP_MS) {
      nextPhoto(card);
      lastTapTime = 0;
      dragging = false;
      card.style.transition = "";
      card.style.transform = "";
      return;
    }
    lastTapTime = now;
  }

  function onPointerMove(e) {
    if (!dragging) return;
    const card = getTopCard();
    if (!card) return;

    dx = e.clientX - startX;
    dy = e.clientY - startY;
    const rotate = Math.max(-ROTATE_DEG, Math.min(ROTATE_DEG, dx / 18));
    card.style.transform = `translate(${dx}px, ${dy}px) rotate(${rotate}deg)`;
  }

  function onPointerUp() {
    if (!dragging) return;
    dragging = false;

    const card = getTopCard();
    if (!card) return;

    if (dx > SWIPE_X_THRESHOLD)   { animateDecision(card, "like");      return; }
    if (dx < -SWIPE_X_THRESHOLD)  { animateDecision(card, "nope");      return; }
    if (dy < -SWIPE_Y_THRESHOLD)  { animateDecision(card, "superlike"); return; }

    // Snap back
    card.style.transition = "transform 220ms ease";
    card.style.transform = "translate(0px, 0px) rotate(0deg)";
  }

  document.addEventListener("pointerdown",  onPointerDown);
  document.addEventListener("pointermove",  onPointerMove);
  document.addEventListener("pointerup",    onPointerUp);
  document.addEventListener("pointercancel", onPointerUp);

  // Power the action buttons using the actual IDs from index.html
  nopeBtn.addEventListener("click",      () => animateDecision(getTopCard(), "nope"));
  likeBtn.addEventListener("click",      () => animateDecision(getTopCard(), "like"));
  superLikeBtn.addEventListener("click", () => animateDecision(getTopCard(), "superlike"));
})();
