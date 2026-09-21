"use strict";

const CONFIG = Object.freeze({
  FLOWER_COUNT: 15,
  AMBIENT_PETAL_MIN_INTERVAL: 2000,
  AMBIENT_PETAL_MAX_INTERVAL: 4000,
  PETAL_REGEN_MIN: 1000,
  PETAL_REGEN_MAX: 3000,
  FLOWER_COOLDOWN: 3400,
  SECRET_NOTE_DURATION: 6200,
  MUSIC_VOLUME: 0.18,
  MUSIC_FADE_IN: 2000,
  MUSIC_LOOP_FADE: 850,
  MUSIC_SEGMENT_START: 0,
  MUSIC_SEGMENT_DURATION: 30,
});

const SVG_NS = "http://www.w3.org/2000/svg";
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const flowerLayout = [
  { x: 310, y: 142, size: 1.08, tilt: -2, petals: 12, tone: 0 },
  { x: 248, y: 181, size: 0.96, tilt: -9, petals: 11, tone: 1 },
  { x: 374, y: 184, size: 0.97, tilt: 9, petals: 12, tone: 2 },
  { x: 194, y: 228, size: 0.84, tilt: -14, petals: 10, tone: 2 },
  { x: 428, y: 229, size: 0.87, tilt: 14, petals: 11, tone: 0 },
  { x: 286, y: 231, size: 0.9, tilt: -5, petals: 10, tone: 1 },
  { x: 343, y: 242, size: 0.92, tilt: 6, petals: 13, tone: 0 },
  { x: 150, y: 276, size: 0.73, tilt: -18, petals: 9, tone: 1 },
  { x: 472, y: 279, size: 0.76, tilt: 17, petals: 10, tone: 2 },
  { x: 220, y: 291, size: 0.8, tilt: -10, petals: 12, tone: 0 },
  { x: 401, y: 296, size: 0.81, tilt: 10, petals: 11, tone: 1 },
  { x: 307, y: 302, size: 0.84, tilt: 1, petals: 10, tone: 2 },
  { x: 180, y: 342, size: 0.7, tilt: -15, petals: 9, tone: 2 },
  { x: 443, y: 343, size: 0.72, tilt: 13, petals: 10, tone: 0 },
  { x: 340, y: 354, size: 0.75, tilt: 5, petals: 11, tone: 1 },
];

const petalPalettes = [
  ["#f6cf4d", "#ffdc64", "#efbd35"],
  ["#ffd85b", "#f8c63e", "#ffe27a"],
  ["#edb931", "#f8cf50", "#ffdf70"],
];

const elements = {
  intro: document.querySelector("#intro"),
  recipientName: document.querySelector("#recipientName"),
  openButton: document.querySelector("#openButton"),
  experience: document.querySelector("#experience"),
  finalCopy: document.querySelector("#finalCopy"),
  bouquetStage: document.querySelector("#bouquetStage"),
  bouquetGlow: document.querySelector("#bouquetGlow"),
  stemsLayer: document.querySelector("#stemsLayer"),
  leavesLayer: document.querySelector("#leavesLayer"),
  flowersLayer: document.querySelector("#flowersLayer"),
  fallingPetalsLayer: document.querySelector("#fallingPetalsLayer"),
  wrapperBack: document.querySelector("#wrapperBack"),
  wrapperFront: document.querySelector("#wrapperFront"),
  ribbon: document.querySelector("#ribbon"),
  sparklesLayer: document.querySelector("#sparklesLayer"),
  heartButton: document.querySelector("#heartButton"),
  secretNote: document.querySelector("#secretNote"),
  closeNote: document.querySelector("#closeNote"),
  flowerInstruction: document.querySelector("#flowerInstruction"),
  ambientPetals: document.querySelector("#ambientPetals"),
  ambientMusic: document.querySelector("#ambientMusic"),
  musicControl: document.querySelector("#musicControl"),
};

let experienceOpened = false;
let bouquetReady = false;
let noteTimer = null;
let ambientTimer = null;
let musicStarted = false;
let musicShouldPlay = false;
let musicLoopTransition = false;
let musicAudioContext = null;
let musicSourceNode = null;
let musicGainNode = null;
let musicGraphUnavailable = false;
let musicFadeFrame = null;
let musicFadeTimer = null;
let musicFadeToken = 0;

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function createSvgElement(tag, attributes = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
  return node;
}

function getRecipientName() {
  const rawName = new URLSearchParams(window.location.search).get("para");

  if (!rawName) return "";

  return rawName
    .normalize("NFC")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}

function applyRecipientName() {
  const name = getRecipientName();
  elements.recipientName.textContent = name ? `Para ${name} 🌼` : "Para ti 🌼";
  document.title = name ? `Flores amarillas para ${name}` : "Flores amarillas para ti";
}

function buildBouquet() {
  flowerLayout.slice(0, CONFIG.FLOWER_COUNT).forEach((flower, index) => {
    createStemAndLeaves(flower, index);
    createFlower(flower, index);
  });

  createSparkles();
}

function createStemAndLeaves(flower, index) {
  const startX = 310 + ((index % 5) - 2) * 4;
  const startY = 535 + (index % 3) * 3;
  const controlX = (startX + flower.x) / 2 + ((index % 2 === 0 ? 1 : -1) * (10 + (index % 3) * 4));
  const controlY = flower.y + (startY - flower.y) * 0.58;
  // El tallo termina en el origen de la cabeza floral, que es su centro real.
  const endY = flower.y;

  const stem = createSvgElement("path", {
    class: `stem${index % 4 === 0 ? " stem--light" : ""}`,
    d: `M ${startX} ${startY} Q ${controlX} ${controlY} ${flower.x} ${endY}`,
    pathLength: 1,
  });
  elements.stemsLayer.append(stem);

  const leafProgress = 0.47 + (index % 4) * 0.045;
  const leafX = startX + (flower.x - startX) * leafProgress;
  const leafY = startY + (endY - startY) * leafProgress;
  const direction = index % 2 === 0 ? 1 : -1;
  const leafAngle = direction === 1 ? -32 + (index % 3) * 7 : 207 - (index % 3) * 6;

  const leaf = createLeaf(leafX, leafY, leafAngle, flower.size * randomBetween(0.82, 1.06), index);
  elements.leavesLayer.append(leaf);

  if (index % 3 === 0) {
    const secondProgress = 0.68;
    const secondX = startX + (flower.x - startX) * secondProgress;
    const secondY = startY + (endY - startY) * secondProgress;
    const secondLeaf = createLeaf(
      secondX,
      secondY,
      direction === 1 ? 198 : -22,
      flower.size * 0.72,
      index + 20,
    );
    elements.leavesLayer.append(secondLeaf);
  }
}

function createLeaf(x, y, rotation, scale, seed) {
  const group = createSvgElement("g", {
    class: "leaf",
    transform: `translate(${x} ${y}) rotate(${rotation}) scale(${scale})`,
  });
  const colors = ["#728558", "#5f7548", "#879767"];
  const leaf = createSvgElement("path", {
    d: "M 0 0 C 13 -17 33 -18 43 -4 C 31 10 13 11 0 0 Z",
    fill: colors[seed % colors.length],
  });
  const vein = createSvgElement("path", {
    d: "M 3 0 C 15 -1 27 -3 39 -5",
    fill: "none",
    stroke: "#dbe0be",
    "stroke-width": 1.2,
    opacity: 0.55,
  });
  group.append(leaf, vein);
  return group;
}

function createFlower(flower, index) {
  const root = createSvgElement("g", {
    class: "flower-root",
    transform: `translate(${flower.x} ${flower.y}) scale(${flower.size})`,
    role: "button",
    tabindex: -1,
    "aria-label": `Flor amarilla ${index + 1}. Tócala para desprender pétalos.`,
    "data-flower-index": index,
    "data-x": flower.x,
    "data-y": flower.y,
    "data-size": flower.size,
    "data-tilt": flower.tilt,
  });

  const sway = createSvgElement("g", {
    class: "flower-sway",
    transform: `rotate(${flower.tilt})`,
  });
  const bloom = createSvgElement("g", { class: "flower-bloom" });
  const petals = createSvgElement("g", { class: "petals" });
  const palette = petalPalettes[flower.tone % petalPalettes.length];
  const petalLength = index % 4 === 0 ? 37 : index % 3 === 0 ? 33 : 35;
  const petalWidth = index % 4 === 0 ? 8.3 : 9.5;

  for (let petalIndex = 0; petalIndex < flower.petals; petalIndex += 1) {
    const angle = (360 / flower.petals) * petalIndex + (index % 2 ? 3 : 0);
    const slot = createSvgElement("g", {
      class: "petal-slot",
      transform: `rotate(${angle})`,
      "data-angle": angle,
    });
    const widthVariation = 1 + ((petalIndex % 3) - 1) * 0.035;
    const lengthVariation = 1 + ((petalIndex % 4) - 1.5) * 0.02;
    const petal = createSvgElement("path", {
      class: "petal",
      d: `M 0 -4 C ${-petalWidth * widthVariation} -11 ${-petalWidth * 1.05} ${-petalLength * 0.72 * lengthVariation} 0 ${-petalLength * lengthVariation} C ${petalWidth * 1.05} ${-petalLength * 0.72 * lengthVariation} ${petalWidth * widthVariation} -11 0 -4 Z`,
      fill: palette[petalIndex % palette.length],
      "data-petal-index": petalIndex,
    });
    slot.append(petal);
    petals.append(slot);
  }

  const centerGroup = createSvgElement("g", { class: "flower-center-group" });
  const center = createSvgElement("circle", {
    class: "flower-center",
    r: index % 4 === 0 ? 13 : 12,
    fill: index % 3 === 0 ? "#9a691e" : "#aa771f",
  });
  centerGroup.append(center);

  for (let dot = 0; dot < 7; dot += 1) {
    const angle = (Math.PI * 2 * dot) / 7;
    const radius = dot === 6 ? 0 : 6.6;
    centerGroup.append(
      createSvgElement("circle", {
        class: "center-seed",
        cx: Math.cos(angle) * radius,
        cy: Math.sin(angle) * radius,
        r: dot === 6 ? 2.6 : 1.75,
      }),
    );
  }

  const hitArea = createSvgElement("circle", { class: "flower-hit", r: 44 });
  bloom.append(petals, centerGroup, hitArea);
  sway.append(bloom);
  root.append(sway);
  elements.flowersLayer.append(root);

  root.addEventListener("click", () => interactWithFlower(root));
  root.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    interactWithFlower(root);
  });
}

function createSparkles() {
  const positions = [
    [123, 198], [493, 185], [111, 311], [516, 330], [246, 104], [405, 116], [80, 250], [539, 251],
  ];

  positions.forEach(([x, y], index) => {
    const sparkle = createSvgElement("path", {
      class: "sparkle",
      d: "M 0 -7 C 1 -2 2 -1 7 0 C 2 1 1 2 0 7 C -1 2 -2 1 -7 0 C -2 -1 -1 -2 0 -7 Z",
      transform: `translate(${x} ${y}) scale(${index % 3 === 0 ? 0.72 : 0.5})`,
    });
    elements.sparklesLayer.append(sparkle);
  });
}

function setupMusicOutput() {
  if (musicGainNode || musicGraphUnavailable) return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  // El volumen nativo es más confiable al abrir el proyecto directamente con file://.
  if (!AudioContextClass || window.location.protocol === "file:") {
    musicGraphUnavailable = true;
    elements.ambientMusic.volume = 0;
    return;
  }

  try {
    musicAudioContext = new AudioContextClass();
    musicSourceNode = musicAudioContext.createMediaElementSource(elements.ambientMusic);
    musicGainNode = musicAudioContext.createGain();
    musicSourceNode.connect(musicGainNode);
    musicGainNode.connect(musicAudioContext.destination);
    musicGainNode.gain.value = 0;
    elements.ambientMusic.volume = 1;
  } catch (error) {
    musicGraphUnavailable = true;
    musicAudioContext = null;
    musicSourceNode = null;
    musicGainNode = null;
    elements.ambientMusic.volume = 0;
  }
}

function resumeMusicOutput() {
  if (musicAudioContext?.state === "suspended") {
    musicAudioContext.resume().catch(() => {});
  }
}

function cancelMusicFade() {
  musicFadeToken += 1;

  if (musicFadeFrame) {
    window.cancelAnimationFrame(musicFadeFrame);
    musicFadeFrame = null;
  }

  if (musicFadeTimer) {
    window.clearTimeout(musicFadeTimer);
    musicFadeTimer = null;
  }

  if (musicGainNode && musicAudioContext) {
    const gain = musicGainNode.gain;
    const now = musicAudioContext.currentTime;

    if (typeof gain.cancelAndHoldAtTime === "function") {
      gain.cancelAndHoldAtTime(now);
    } else {
      const currentValue = gain.value;
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(currentValue, now);
    }
  }
}

function setMusicLevel(level) {
  const safeLevel = Math.max(0, Math.min(1, level));

  if (musicGainNode) {
    musicGainNode.gain.value = safeLevel;
  } else {
    elements.ambientMusic.volume = safeLevel;
  }
}

function fadeMusicTo(targetLevel, duration, onComplete) {
  cancelMusicFade();
  const token = musicFadeToken;
  const safeTarget = Math.max(0, Math.min(1, targetLevel));

  if (musicGainNode && musicAudioContext) {
    const gain = musicGainNode.gain;
    const now = musicAudioContext.currentTime;
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(safeTarget, now + duration / 1000);

    musicFadeTimer = window.setTimeout(() => {
      if (token !== musicFadeToken) return;
      musicFadeTimer = null;
      if (onComplete) onComplete();
    }, duration + 30);
    return;
  }

  const initialLevel = elements.ambientMusic.volume;
  const startedAt = performance.now();

  const updateVolume = (now) => {
    if (token !== musicFadeToken) return;
    const progress = Math.min((now - startedAt) / duration, 1);
    const easedProgress = 0.5 - Math.cos(Math.PI * progress) / 2;
    elements.ambientMusic.volume = initialLevel + (safeTarget - initialLevel) * easedProgress;

    if (progress < 1) {
      musicFadeFrame = window.requestAnimationFrame(updateVolume);
    } else {
      musicFadeFrame = null;
      if (onComplete) onComplete();
    }
  };

  musicFadeFrame = window.requestAnimationFrame(updateVolume);
}

function updateMusicControl() {
  const label = musicShouldPlay ? "Pausar música" : "Reanudar música";
  elements.musicControl.classList.toggle("is-paused", !musicShouldPlay);
  elements.musicControl.setAttribute("aria-label", label);
  elements.musicControl.setAttribute("aria-pressed", String(musicShouldPlay));
  elements.musicControl.title = label;
}

function handleMusicPlayFailure() {
  musicShouldPlay = false;
  musicLoopTransition = false;
  updateMusicControl();
}

function playMusicWithFade(fadeDuration) {
  resumeMusicOutput();
  const playRequest = elements.ambientMusic.play();
  const beginFade = () => {
    if (!musicShouldPlay) return;
    fadeMusicTo(CONFIG.MUSIC_VOLUME, fadeDuration);
    updateMusicControl();
  };

  if (playRequest && typeof playRequest.then === "function") {
    playRequest.then(beginFade).catch(handleMusicPlayFailure);
  } else {
    beginFade();
  }
}

function startAmbientMusic() {
  musicStarted = true;
  musicShouldPlay = true;
  musicLoopTransition = false;
  setupMusicOutput();
  cancelMusicFade();
  setMusicLevel(0);

  try {
    elements.ambientMusic.currentTime = CONFIG.MUSIC_SEGMENT_START;
  } catch (error) {
    // La pista ya comienza en 0; Safari puede esperar a loadedmetadata para aceptar seeking.
  }

  elements.musicControl.disabled = false;
  elements.musicControl.classList.add("is-visible");
  updateMusicControl();
  playMusicWithFade(CONFIG.MUSIC_FADE_IN);
}

function pauseAmbientMusic() {
  musicShouldPlay = false;
  musicLoopTransition = false;
  updateMusicControl();

  fadeMusicTo(0, 360, () => {
    if (!musicShouldPlay) elements.ambientMusic.pause();
  });
}

function resumeAmbientMusic() {
  const segmentEnd = getMusicSegmentEnd();
  musicShouldPlay = true;
  musicLoopTransition = false;
  cancelMusicFade();
  setMusicLevel(0);

  if (elements.ambientMusic.currentTime >= segmentEnd - 0.15) {
    elements.ambientMusic.currentTime = CONFIG.MUSIC_SEGMENT_START;
  }

  updateMusicControl();
  playMusicWithFade(700);
}

function toggleAmbientMusic() {
  if (!musicStarted) return;

  if (musicShouldPlay) {
    pauseAmbientMusic();
  } else {
    resumeAmbientMusic();
  }
}

function getMusicSegmentEnd() {
  const requestedEnd = CONFIG.MUSIC_SEGMENT_START + CONFIG.MUSIC_SEGMENT_DURATION;
  const trackDuration = elements.ambientMusic.duration;
  return Number.isFinite(trackDuration) && trackDuration > 0
    ? Math.min(requestedEnd, trackDuration)
    : requestedEnd;
}

function restartMusicSegment() {
  if (musicLoopTransition || !musicShouldPlay) return;
  musicLoopTransition = true;

  fadeMusicTo(0, CONFIG.MUSIC_LOOP_FADE, () => {
    if (!musicShouldPlay) {
      musicLoopTransition = false;
      return;
    }

    elements.ambientMusic.currentTime = CONFIG.MUSIC_SEGMENT_START;
    resumeMusicOutput();
    const playRequest = elements.ambientMusic.play();
    const fadeBackIn = () => {
      fadeMusicTo(CONFIG.MUSIC_VOLUME, CONFIG.MUSIC_LOOP_FADE, () => {
        musicLoopTransition = false;
      });
    };

    if (playRequest && typeof playRequest.then === "function") {
      playRequest.then(fadeBackIn).catch(handleMusicPlayFailure);
    } else {
      fadeBackIn();
    }
  });
}

function monitorMusicSegment() {
  if (!musicShouldPlay || musicLoopTransition || elements.ambientMusic.paused) return;

  const fadeWindow = CONFIG.MUSIC_LOOP_FADE / 1000 + 0.15;
  if (elements.ambientMusic.currentTime >= getMusicSegmentEnd() - fadeWindow) {
    restartMusicSegment();
  }
}

function openExperience() {
  if (experienceOpened) return;
  experienceOpened = true;
  startAmbientMusic();
  elements.openButton.disabled = true;
  elements.experience.setAttribute("aria-hidden", "false");
  elements.experience.style.visibility = "visible";

  if (prefersReducedMotion.matches || !window.gsap) {
    revealWithoutMotion();
    return;
  }

  animateBouquetReveal();
}

function animateBouquetReveal() {
  const petals = Array.from(document.querySelectorAll(".petal"));
  const flowerBlooms = Array.from(document.querySelectorAll(".flower-bloom"));
  const centers = Array.from(document.querySelectorAll(".flower-center-group"));
  const leaves = Array.from(document.querySelectorAll(".leaf"));
  const stems = Array.from(document.querySelectorAll(".stem"));

  gsap.set(elements.bouquetStage, { opacity: 0 });
  gsap.set([elements.wrapperBack, elements.wrapperFront], { opacity: 0, y: 18 });
  gsap.set(stems, { strokeDashoffset: 1 });
  gsap.set(leaves, { opacity: 0, scale: 0, transformOrigin: "0% 50%" });
  gsap.set(flowerBlooms, { opacity: 0, scale: 0.14, rotation: -7, transformOrigin: "50% 50%" });
  gsap.set(petals, { scale: 0.12, opacity: 0, transformOrigin: "50% 90%" });
  gsap.set(centers, { scale: 0, opacity: 0, transformOrigin: "50% 50%" });

  const timeline = gsap.timeline({
    defaults: { ease: "power2.out" },
    onComplete: finishBouquetReveal,
  });

  timeline
    .to(elements.intro, { opacity: 0, y: -14, filter: "blur(5px)", duration: 0.65 })
    .set(elements.intro, { display: "none" })
    .to(elements.bouquetStage, { opacity: 1, duration: 0.55 })
    .to(elements.wrapperBack, { opacity: 1, y: 0, duration: 0.7 }, "<0.05")
    .to(elements.wrapperFront, { opacity: 1, y: 0, duration: 0.7 }, "<0.08")
    .to(stems, { strokeDashoffset: 0, duration: 1.25, stagger: 0.055, ease: "power1.inOut" }, "-=0.35")
    .to(leaves, { opacity: 1, scale: 1, duration: 0.48, stagger: 0.04, ease: "back.out(1.5)" }, "-=0.65");

  flowerBlooms.forEach((bloom, index) => {
    const flowerPetals = bloom.querySelectorAll(".petal");
    const center = bloom.querySelector(".flower-center-group");
    const startAt = `flower-${index}`;
    timeline.addLabel(startAt, `>-0.32`);
    timeline.to(bloom, { opacity: 1, scale: 1, rotation: 0, duration: 0.48, ease: "back.out(1.35)" }, startAt);
    timeline.to(
      flowerPetals,
      { opacity: 1, scale: 1, duration: 0.38, stagger: 0.022, ease: "back.out(1.8)" },
      `${startAt}+=0.12`,
    );
    timeline.to(center, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(1.8)" }, `${startAt}+=0.24`);
  });

  timeline
    .to(elements.bouquetGlow, { opacity: 1, scale: 1, duration: 1.4, ease: "sine.out" }, "-=0.1")
    .to(document.querySelectorAll(".sparkle"), {
      opacity: 0.68,
      scale: 1,
      duration: 0.55,
      stagger: { each: 0.06, from: "random" },
      ease: "back.out(2)",
    }, "<0.08")
    .fromTo(
      elements.finalCopy,
      { opacity: 0, y: 18, filter: "blur(5px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.9 },
      "-=0.75",
    )
    .to(elements.heartButton, { opacity: 1, duration: 0.45 }, "-=0.42")
    .to(elements.flowerInstruction, { opacity: 1, duration: 0.55 }, "-=0.2");
}

function revealWithoutMotion() {
  elements.intro.hidden = true;
  elements.bouquetStage.style.opacity = "1";
  elements.wrapperBack.style.opacity = "1";
  elements.wrapperFront.style.opacity = "1";
  elements.bouquetGlow.style.opacity = "1";
  elements.bouquetGlow.style.transform = "translateX(-50%) scale(1)";
  elements.finalCopy.style.opacity = "1";
  elements.heartButton.style.opacity = "1";
  elements.flowerInstruction.style.opacity = "1";
  document.querySelectorAll(".stem").forEach((stem) => { stem.style.strokeDashoffset = "0"; });
  document.querySelectorAll(".leaf, .flower-bloom, .petal, .flower-center-group").forEach((node) => {
    node.style.opacity = "1";
  });
  finishBouquetReveal();
}

function finishBouquetReveal() {
  bouquetReady = true;
  elements.heartButton.disabled = false;
  elements.heartButton.classList.add("is-ready");
  document.querySelectorAll(".flower-root").forEach((flower) => flower.setAttribute("tabindex", "0"));
  startAmbientPetals();

  if (!prefersReducedMotion.matches && window.gsap) {
    startBouquetBreeze();
  }
}

function startBouquetBreeze() {
  const flowerRoots = Array.from(document.querySelectorAll(".flower-root"));
  const flowerSways = flowerRoots.map((root) => root.querySelector(".flower-sway"));

  // Evita duplicar tweens si cambia la preferencia de movimiento del sistema.
  gsap.killTweensOf(flowerSways);

  flowerRoots.forEach((root, index) => {
    const flower = root.querySelector(".flower-sway");
    const baseTilt = Number(root.dataset.tilt || 0);
    const rotationAmplitude = randomBetween(0.55, 1.15);
    const verticalAmplitude = randomBetween(0.45, 1.15);

    gsap.fromTo(
      flower,
      {
        rotation: baseTilt - rotationAmplitude,
        y: verticalAmplitude,
      },
      {
        rotation: baseTilt + rotationAmplitude,
        y: -verticalAmplitude,
        duration: randomBetween(3.8, 5.6),
        delay: randomBetween(0, 1.4),
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        transformOrigin: "50% 50%",
      },
    );
  });
}

function stopBouquetBreeze() {
  const flowerRoots = Array.from(document.querySelectorAll(".flower-root"));
  const flowerSways = flowerRoots.map((root) => root.querySelector(".flower-sway"));

  gsap.killTweensOf(flowerSways);
  flowerRoots.forEach((root, index) => {
    const flower = flowerSways[index];
    const baseTilt = Number(root.dataset.tilt || 0);

    gsap.set(flower, {
      rotation: baseTilt,
      y: 0,
      transformOrigin: "50% 50%",
    });
  });
}

function interactWithFlower(root) {
  if (!bouquetReady) return;

  const now = Date.now();
  const cooldownUntil = Number(root.dataset.cooldownUntil || 0);
  if (now < cooldownUntil || root.dataset.busy === "true") return;

  root.dataset.busy = "true";
  root.dataset.cooldownUntil = String(now + CONFIG.FLOWER_COOLDOWN);
  const bloom = root.querySelector(".flower-bloom");
  const availablePetals = Array.from(root.querySelectorAll(".petal:not([data-missing='true'])"));
  const fallingCount = Math.min(Math.random() > 0.42 ? 2 : 1, availablePetals.length);
  const chosen = [];

  while (chosen.length < fallingCount && availablePetals.length) {
    const selectedIndex = Math.floor(Math.random() * availablePetals.length);
    chosen.push(availablePetals.splice(selectedIndex, 1)[0]);
  }

  if (window.gsap && !prefersReducedMotion.matches) {
    gsap.fromTo(
      bloom,
      { rotation: 0 },
      { rotation: root.dataset.flowerIndex % 2 === 0 ? 7 : -7, duration: 0.18, yoyo: true, repeat: 3, ease: "sine.inOut", overwrite: "auto" },
    );
  }

  let latestRegen = 0;
  chosen.forEach((petal) => {
    const regenDelay = randomBetween(CONFIG.PETAL_REGEN_MIN, CONFIG.PETAL_REGEN_MAX);
    latestRegen = Math.max(latestRegen, regenDelay);
    detachPetal(root, petal, regenDelay);
  });

  window.setTimeout(() => {
    root.dataset.busy = "false";
  }, latestRegen + 850);
}

function detachPetal(root, petal, regenDelay) {
  petal.dataset.missing = "true";
  const slot = petal.closest(".petal-slot");
  const angle = Number(slot.dataset.angle || 0) + Number(root.dataset.tilt || 0);
  const size = Number(root.dataset.size || 1);
  const x = Number(root.dataset.x || 0) + Math.sin((angle * Math.PI) / 180) * 22 * size;
  const y = Number(root.dataset.y || 0) - Math.cos((angle * Math.PI) / 180) * 22 * size;
  const paletteColor = petal.getAttribute("fill") || "#f5ca45";

  createFallingSvgPetal(x, y, angle, size, paletteColor);

  const restore = () => {
    if (petal.dataset.missing !== "true") return;
    petal.dataset.missing = "false";

    if (window.gsap && !prefersReducedMotion.matches) {
      gsap.fromTo(
        petal,
        { opacity: 1, scale: 0.04, transformOrigin: "50% 90%" },
        { opacity: 1, scale: 1, duration: 0.62, ease: "back.out(1.9)", overwrite: true },
      );
    } else {
      petal.style.opacity = "1";
      petal.style.transform = "none";
    }
  };

  if (window.gsap && !prefersReducedMotion.matches) {
    gsap.to(petal, { opacity: 0, scale: 0.08, duration: 0.16, transformOrigin: "50% 90%", overwrite: true });
  } else {
    petal.style.opacity = "0";
  }

  window.setTimeout(restore, regenDelay);
  window.setTimeout(restore, regenDelay + 1000);
}

function createFallingSvgPetal(x, y, angle, size, color) {
  if (prefersReducedMotion.matches) return;

  const falling = createSvgElement("g", { class: "falling-petal" });
  const shape = createSvgElement("path", {
    d: "M 0 -3 C -8 -10 -9 -25 0 -34 C 9 -25 8 -10 0 -3 Z",
    fill: color,
    transform: `rotate(${angle}) scale(${size})`,
  });
  falling.append(shape);
  elements.fallingPetalsLayer.append(falling);

  if (!window.gsap) {
    falling.remove();
    return;
  }

  const drift = randomBetween(-42, 42);
  const duration = randomBetween(1.25, 1.9);
  gsap.set(falling, { x, y, rotation: 0, transformOrigin: "0 0" });
  gsap.to(falling, {
    y: y + randomBetween(135, 220),
    rotation: randomBetween(-155, 190),
    opacity: 0,
    duration,
    ease: "power1.in",
    onComplete: () => falling.remove(),
  });
  gsap.to(falling, { x: x + drift, duration: duration * 0.52, yoyo: true, repeat: 1, ease: "sine.inOut" });
}

function scheduleAmbientPetal() {
  window.clearTimeout(ambientTimer);
  ambientTimer = window.setTimeout(() => {
    if (!document.hidden && experienceOpened && !prefersReducedMotion.matches) {
      createAmbientPetal();
    }
    scheduleAmbientPetal();
  }, randomBetween(CONFIG.AMBIENT_PETAL_MIN_INTERVAL, CONFIG.AMBIENT_PETAL_MAX_INTERVAL));
}

function startAmbientPetals() {
  if (prefersReducedMotion.matches || ambientTimer || !window.gsap) return;
  scheduleAmbientPetal();
}

function createAmbientPetal() {
  const petal = document.createElementNS(SVG_NS, "svg");
  petal.setAttribute("class", "ambient-petal");
  petal.setAttribute("viewBox", "-10 -34 20 38");
  petal.style.setProperty("--petal-size", `${randomBetween(8, 15)}px`);
  petal.style.setProperty("--petal-color", Math.random() > 0.5 ? "#f4ca45" : "#ffe079");
  petal.append(
    createSvgElement("path", { d: "M 0 -2 C -8 -9 -9 -25 0 -33 C 9 -25 8 -9 0 -2 Z" }),
  );
  elements.ambientPetals.append(petal);

  const startX = randomBetween(4, 96);
  petal.style.left = `${startX}vw`;

  if (!window.gsap) {
    petal.remove();
    return;
  }

  const viewportHeight = window.innerHeight;
  const duration = randomBetween(6.2, 10.5);
  const drift = randomBetween(-80, 80);
  gsap.set(petal, { rotation: randomBetween(-45, 45), opacity: 0 });
  gsap.to(petal, { opacity: 0.78, duration: 0.5 });
  gsap.to(petal, {
    y: viewportHeight + 90,
    rotation: randomBetween(220, 620),
    duration,
    ease: "none",
    onComplete: () => petal.remove(),
  });
  gsap.to(petal, { x: drift, duration: duration / 2, yoyo: true, repeat: 1, ease: "sine.inOut" });
}

function showSecretNote() {
  if (!bouquetReady) return;
  window.clearTimeout(noteTimer);
  elements.heartButton.setAttribute("aria-expanded", "true");
  elements.secretNote.setAttribute("aria-hidden", "false");
  elements.secretNote.inert = false;
  elements.secretNote.classList.add("is-visible");

  if (window.gsap && !prefersReducedMotion.matches) {
    gsap.to(elements.secretNote, { opacity: 1, y: 0, scale: 1, duration: 0.38, ease: "back.out(1.45)", overwrite: true });
    gsap.fromTo(elements.heartButton, { scale: 1 }, { scale: 1.16, duration: 0.18, yoyo: true, repeat: 1, ease: "sine.inOut" });
  } else {
    elements.secretNote.style.opacity = "1";
    elements.secretNote.style.transform = "translate(-50%, 0) scale(1)";
  }

  noteTimer = window.setTimeout(hideSecretNote, CONFIG.SECRET_NOTE_DURATION);
}

function hideSecretNote({ returnFocus = false } = {}) {
  window.clearTimeout(noteTimer);
  elements.heartButton.setAttribute("aria-expanded", "false");
  elements.secretNote.setAttribute("aria-hidden", "true");
  elements.secretNote.inert = true;

  const finish = () => {
    elements.secretNote.classList.remove("is-visible");
    if (returnFocus) elements.heartButton.focus();
  };

  if (window.gsap && !prefersReducedMotion.matches) {
    gsap.to(elements.secretNote, { opacity: 0, y: 12, scale: 0.96, duration: 0.26, ease: "power2.in", overwrite: true, onComplete: finish });
  } else {
    elements.secretNote.style.opacity = "0";
    finish();
  }
}

function handleMotionPreferenceChange(event) {
  if (event.matches) {
    window.clearTimeout(ambientTimer);
    ambientTimer = null;
    document.querySelectorAll(".ambient-petal").forEach((petal) => petal.remove());
    if (window.gsap) {
      stopBouquetBreeze();
    }
  } else if (bouquetReady) {
    startAmbientPetals();
    if (window.gsap) startBouquetBreeze();
  }
}

applyRecipientName();
buildBouquet();

elements.openButton.addEventListener("click", openExperience);
elements.heartButton.addEventListener("click", showSecretNote);
elements.closeNote.addEventListener("click", () => hideSecretNote({ returnFocus: true }));
elements.musicControl.addEventListener("click", toggleAmbientMusic);
elements.ambientMusic.addEventListener("timeupdate", monitorMusicSegment);
elements.ambientMusic.addEventListener("error", () => {
  musicShouldPlay = false;
  musicLoopTransition = false;
  elements.musicControl.disabled = true;
  elements.musicControl.classList.add("is-paused");
  elements.musicControl.setAttribute("aria-label", "Música no disponible");
  elements.musicControl.title = "Música no disponible";
});
if (typeof prefersReducedMotion.addEventListener === "function") {
  prefersReducedMotion.addEventListener("change", handleMotionPreferenceChange);
} else {
  prefersReducedMotion.addListener(handleMotionPreferenceChange);
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && bouquetReady && !prefersReducedMotion.matches && !ambientTimer) {
    startAmbientPetals();
  }
});
