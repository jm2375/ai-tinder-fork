// app.js
// Plain global JS, no modules.

// -------------------
// Data
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
function pickTags() { return Array.from(new Set(Array.from({length: 4}, () => sample(TAGS)))); }
function imgFor(seed) {
  return `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=1200&q=80`;
}
function pickImgs(n = 3) {
  return [...UNSPLASH_SEEDS].sort(() => Math.random() - 0.5).slice(0, n).map(imgFor);
}

function generateProfiles(count = 12) {
  const profiles = [];
  for (let i = 0; i < count; i++) {
    const imgs = pickImgs(3);
    profiles.push({
      id: `p_${i}_${Date.now().toString(36)}`,
      name: sample(FIRST_NAMES),
      age: 18 + Math.floor(Math.random() * 22),
      city: sample(CITIES),
      title: sample(JOBS),
      bio: sample(BIOS),
      tags: pickTags(),
      imgs,
      photoIdx: 0,
    });
  }
  return profiles;
}

// -------------------
// DOM references
// -------------------
const deckEl = document.getElementById("deck");
const shuffleBtn = document.getElementById("shuffleBtn");
const likeBtn = document.getElementById("likeBtn");
const nopeBtn = document.getElementById("nopeBtn");
const superLikeBtn = document.getElementById("superLikeBtn");

let profiles = [];

// -------------------
// Card rendering
// -------------------
function makeCard(p) {
  const card = document.createElement("article");
  card.className = "card";
  card.dataset.id = p.id;

  const img = document.createElement("img");
  img.className = "card__media";
  img.src = p.imgs[0];
  img.alt = `${p.name} — profile photo`;
  img.draggable = false;

  // Photo dot indicators
  const dots = document.createElement("div");
  dots.className = "card__dots";
  p.imgs.forEach((_, i) => {
    const dot = document.createElement("span");
    dot.className = "card__dot" + (i === 0 ? " card__dot--active" : "");
    dots.appendChild(dot);
  });

  // Swipe overlays
  const likeOverlay = document.createElement("div");
  likeOverlay.className = "card__overlay card__overlay--like";
  likeOverlay.textContent = "LIKE";

  const nopeOverlay = document.createElement("div");
  nopeOverlay.className = "card__overlay card__overlay--nope";
  nopeOverlay.textContent = "NOPE";

  const superOverlay = document.createElement("div");
  superOverlay.className = "card__overlay card__overlay--super";
  superOverlay.textContent = "SUPER";

  // Card body
  const body = document.createElement("div");
  body.className = "card__body";

  const titleRow = document.createElement("div");
  titleRow.className = "title-row";
  titleRow.innerHTML = `<h2 class="card__title">${p.name}</h2><span class="card__age">${p.age}</span>`;

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
  card.appendChild(dots);
  card.appendChild(likeOverlay);
  card.appendChild(nopeOverlay);
  card.appendChild(superOverlay);
  card.appendChild(body);

  return card;
}

function renderDeck() {
  deckEl.setAttribute("aria-busy", "true");
  deckEl.innerHTML = "";
  profiles.forEach((p) => deckEl.appendChild(makeCard(p)));
  attachSwipe();
  deckEl.removeAttribute("aria-busy");
}

function renderEmpty() {
  deckEl.innerHTML = `
    <div class="deck__empty">
      <p>You've seen everyone!</p>
      <button class="ghost-btn" onclick="resetDeck()">Shuffle again</button>
    </div>
  `;
}

// -------------------
// Dismiss / animate out
// -------------------
const SWIPE_THRESHOLD = 80;
const FLY_DISTANCE = 900;

function getTopCard() {
  return deckEl.firstElementChild;
}

function dismiss(direction) {
  if (profiles.length === 0) return;
  const card = getTopCard();
  if (!card || card.classList.contains("card--flying")) return;

  card.classList.add("card--flying");
  card.style.pointerEvents = "none";
  lastTap = 0;

  let tx = 0, ty = 0, rot = 0;
  if (direction === "right") { tx = FLY_DISTANCE; rot = 30; }
  else if (direction === "left") { tx = -FLY_DISTANCE; rot = -30; }
  else if (direction === "up") { ty = -FLY_DISTANCE; }

  card.style.transition = "transform 400ms ease, opacity 400ms ease";
  // rAF ensures the browser sees the transition rule before we set the end transform
  requestAnimationFrame(() => {
    card.style.transform = `translate(${tx}px, ${ty}px) rotate(${rot}deg)`;
    card.style.opacity = "0";
  });

  card.addEventListener("transitionend", () => {
    card.remove();
    profiles.shift();
    if (profiles.length === 0) {
      renderEmpty();
    } else {
      attachSwipe();
    }
  }, { once: true });
}

// -------------------
// Pointer / swipe gesture
// -------------------
let drag = null;
let lastTap = 0;

function attachSwipe() {
  const card = getTopCard();
  if (!card || !card.classList.contains("card")) return;
  card.addEventListener("pointerdown", onPointerDown);
}

function onPointerDown(e) {
  if (e.pointerType === "mouse" && e.button !== 0) return;

  const card = e.currentTarget;
  card.setPointerCapture(e.pointerId);

  drag = { card, startX: e.clientX, startY: e.clientY, moved: false };

  card.style.transition = "none";
  card.style.cursor = "grabbing";
  card.addEventListener("pointermove", onPointerMove);
  card.addEventListener("pointerup", onPointerUp);
  card.addEventListener("pointercancel", onPointerUp);
}

function onPointerMove(e) {
  if (!drag) return;
  const dx = e.clientX - drag.startX;
  const dy = e.clientY - drag.startY;

  if (Math.abs(dx) > 5 || Math.abs(dy) > 5) drag.moved = true;

  drag.card.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx * 0.07}deg)`;

  const likeEl  = drag.card.querySelector(".card__overlay--like");
  const nopeEl  = drag.card.querySelector(".card__overlay--nope");
  const superEl = drag.card.querySelector(".card__overlay--super");

  const isSuper = dy < -60 && Math.abs(dy) > Math.abs(dx) * 1.2;
  if (isSuper) {
    likeEl.style.opacity  = "0";
    nopeEl.style.opacity  = "0";
    superEl.style.opacity = Math.min(1, (-dy - 60) / 80).toString();
  } else if (dx > 20) {
    likeEl.style.opacity  = Math.min(1, (dx - 20) / 80).toString();
    nopeEl.style.opacity  = "0";
    superEl.style.opacity = "0";
  } else if (dx < -20) {
    nopeEl.style.opacity  = Math.min(1, (-dx - 20) / 80).toString();
    likeEl.style.opacity  = "0";
    superEl.style.opacity = "0";
  } else {
    likeEl.style.opacity  = "0";
    nopeEl.style.opacity  = "0";
    superEl.style.opacity = "0";
  }
}

function onPointerUp(e) {
  if (!drag) return;
  const { card, startX, startY, moved } = drag;
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;

  card.style.cursor = "";
  card.removeEventListener("pointermove", onPointerMove);
  card.removeEventListener("pointerup", onPointerUp);
  card.removeEventListener("pointercancel", onPointerUp);

  const isUp    = dy < -SWIPE_THRESHOLD && Math.abs(dy) > Math.abs(dx) * 1.2;
  const isRight = dx >  SWIPE_THRESHOLD && !isUp;
  const isLeft  = dx < -SWIPE_THRESHOLD && !isUp;

  if (isRight || isLeft || isUp) {
    drag = null;
    dismiss(isRight ? "right" : isLeft ? "left" : "up");
    return;
  }

  // Snap back
  card.style.transition = "transform 300ms ease";
  card.style.transform  = "";
  card.querySelectorAll(".card__overlay").forEach(el => el.style.opacity = "0");
  drag = null;

  // Double-tap detection (only on non-swipe releases)
  if (!moved) {
    const now = Date.now();
    if (now - lastTap < 350) {
      cyclePhoto(card);
      lastTap = 0;
    } else {
      lastTap = now;
    }
  }
}

// -------------------
// Photo cycling
// -------------------
function cyclePhoto(card) {
  const p = profiles[0];
  if (!p || p.imgs.length <= 1) return;

  p.photoIdx = (p.photoIdx + 1) % p.imgs.length;
  card.querySelector(".card__media").src = p.imgs[p.photoIdx];

  card.querySelectorAll(".card__dot").forEach((dot, i) => {
    dot.classList.toggle("card__dot--active", i === p.photoIdx);
  });
}

// -------------------
// Controls
// -------------------
likeBtn.addEventListener("click",      () => dismiss("right"));
nopeBtn.addEventListener("click",      () => dismiss("left"));
superLikeBtn.addEventListener("click", () => dismiss("up"));
shuffleBtn.addEventListener("click",   resetDeck);

// -------------------
// Boot
// -------------------
function resetDeck() {
  profiles = generateProfiles(12);
  renderDeck();
}

resetDeck();
