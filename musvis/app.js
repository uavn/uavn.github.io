const canvas = document.querySelector("#visualizer");
const ctx = canvas.getContext("2d");
const stage = document.querySelector(".stage");
const audio = document.querySelector("#audio");
const audioFile = document.querySelector("#audioFile");
const emptyState = document.querySelector("#emptyState");
const trackMeta = document.querySelector("#trackMeta");
const styleSelect = document.querySelector("#styleSelect");
const paletteSelect = document.querySelector("#paletteSelect");
const intensityInput = document.querySelector("#intensity");
const intensityValue = document.querySelector("#intensityValue");
const qualitySelect = document.querySelector("#qualitySelect");
const aspectSelect = document.querySelector("#aspectSelect");
const authorInput = document.querySelector("#authorInput");
const titleInput = document.querySelector("#titleInput");
const overlayPosition = document.querySelector("#overlayPosition");
const overlayFont = document.querySelector("#overlayFont");
const overlaySize = document.querySelector("#overlaySize");
const overlaySizeValue = document.querySelector("#overlaySizeValue");
const overlayPulse = document.querySelector("#overlayPulse");
const overlayPulseAmount = document.querySelector("#overlayPulseAmount");
const overlayPulseValue = document.querySelector("#overlayPulseValue");
const playButton = document.querySelector("#playButton");
const recordButton = document.querySelector("#recordButton");
const fullscreenButton = document.querySelector("#fullscreenButton");
const downloadLink = document.querySelector("#downloadLink");
const statusText = document.querySelector("#status");

const palettes = {
  miami: ["#ff4ecd", "#18f2ff", "#ffb86b", "#4026a6"],
  signal: ["#67e8bd", "#f7c66f", "#8cc7ff", "#f26d8f"],
  ember: ["#ff6b3d", "#ffc857", "#3ddc97", "#4d96ff"],
  glass: ["#dff8ff", "#8cc7ff", "#f6f7d7", "#69d2a6"],
  neon: ["#00f5d4", "#fee440", "#f15bb5", "#9b5de5"],
  laser: ["#ff003c", "#00f5ff", "#f8ff00", "#7b2cff"],
  aurora: ["#5eead4", "#a78bfa", "#f0abfc", "#38bdf8"],
  candy: ["#ff71ce", "#01cdfe", "#b967ff", "#fffb96"],
  monoGold: ["#fff2a8", "#ffbf3f", "#d97706", "#ffffff"],
  icefire: ["#7dd3fc", "#f97316", "#f43f5e", "#e0f2fe"],
  toxic: ["#b6ff00", "#00ff85", "#ff00e6", "#111111"],
  plasma: ["#ff006e", "#fb5607", "#ffbe0b", "#3a86ff"],
  midnight: ["#0f172a", "#38bdf8", "#818cf8", "#f472b6"],
  bubblegum: ["#ff8fab", "#ffc2d1", "#bde0fe", "#cdb4db"],
  matrix: ["#00ff41", "#008f11", "#d8ffd8", "#003b00"],
  sunset: ["#ff5c8a", "#ff9f1c", "#ffe66d", "#4d2d8c"],
  royal: ["#f0abfc", "#a855f7", "#22d3ee", "#fef3c7"],
  acid: ["#ccff00", "#00ffd5", "#ff00ff", "#fbff12"],
};

let audioContext;
let analyser;
let mediaSource;
let frequencyData;
let timeData;
let animationId;
let recorder;
let recordedChunks = [];
let startedAt = 0;
let selectedFileName = "musvis-video";
let rotation = 0;
let exportMimeType = "video/webm";
let exportExtension = "webm";
let exportVideoBitrate = 12_000_000;
let hasTrack = false;
let textPulseLevel = 0;
let bassFollower = 0;
let smoothedBass = 0;

function setStatus(message) {
  statusText.textContent = message;
}

function clearCanvas() {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.shadowBlur = 0;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function fitCanvas() {
  const quality = Number(qualitySelect.value);
  const aspect = aspectSelect.value;
  const baseHeights = {
    720: 720,
    1080: 1080,
    2160: 2160,
  };
  const ratios = {
    "16:9": 16 / 9,
    "16:10": 16 / 10,
    "4:3": 4 / 3,
    "1:1": 1,
    "3:4": 3 / 4,
    "9:16": 9 / 16,
  };
  const ratio = ratios[aspect] || ratios["16:9"];
  const height = baseHeights[quality] || baseHeights[720];
  const width = Math.round(height * ratio);

  document.documentElement.style.setProperty("--preview-ratio", String(width / height));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function createAudioGraph() {
  if (!audioContext) {
    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.78;
    frequencyData = new Uint8Array(analyser.frequencyBinCount);
    timeData = new Uint8Array(analyser.fftSize);
  }

  if (!mediaSource) {
    mediaSource = audioContext.createMediaElementSource(audio);
    mediaSource.connect(analyser);
    analyser.connect(audioContext.destination);
  }
}

async function ensureAudioGraphRunning() {
  createAudioGraph();

  if (audioContext.state !== "running") {
    await audioContext.resume();
  }
}

function getEnergy(start, end) {
  let total = 0;
  const first = Math.floor(frequencyData.length * start);
  const last = Math.max(first + 1, Math.floor(frequencyData.length * end));

  for (let i = first; i < last; i += 1) {
    total += frequencyData[i];
  }

  return total / (last - first) / 255;
}

function fillIdleAudioData() {
  if (!frequencyData) {
    frequencyData = new Uint8Array(1024);
  }

  if (!timeData) {
    timeData = new Uint8Array(2048);
  }

  for (let i = 0; i < frequencyData.length; i += 1) {
    const wave = Math.sin(i * 0.08 + rotation * 0.04) * 0.5 + 0.5;
    const falloff = 1 - i / frequencyData.length;
    frequencyData[i] = 18 + wave * 52 * Math.max(0.12, falloff);
  }

  for (let i = 0; i < timeData.length; i += 1) {
    timeData[i] = 128 + Math.sin(i * 0.035 + rotation * 0.03) * 18;
  }
}

function drawBackground(colors, bass, mid) {
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#050707");
  gradient.addColorStop(0.5, colors[0] + "22");
  gradient.addColorStop(1, colors[2] + "18");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function maskBottomArtifact() {
  return;
}

function drawRings(colors, intensity, bass, mid, treble) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const maxRadius = Math.min(canvas.width, canvas.height) * 0.52;
  const rings = 18;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation * 0.006);

  for (let i = rings; i > 0; i -= 1) {
    const pct = i / rings;
    const bin = frequencyData[Math.floor(pct * frequencyData.length * 0.6)] / 255;
    const radius = maxRadius * pct * (0.7 + bass * 0.22) + bin * intensity * 2.2;
    ctx.beginPath();
    ctx.strokeStyle = colors[i % colors.length];
    ctx.globalAlpha = 0.16 + bin * 0.65;
    ctx.lineWidth = 2 + bin * 12;
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, maxRadius * 0.38);
  core.addColorStop(0, colors[0] + "ee");
  core.addColorStop(0.42, colors[1] + "80");
  core.addColorStop(1, "transparent");
  ctx.globalAlpha = 0.45 + treble * 0.35;
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, maxRadius * (0.24 + mid * 0.18), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBars(colors, intensity, bass) {
  const bars = 96;
  const gap = 4;
  const width = canvas.width / bars;
  const baseline = canvas.height * 0.76;

  for (let i = 0; i < bars; i += 1) {
    const sampleIndex = Math.floor((i / bars) * frequencyData.length * 0.72);
    const value = frequencyData[sampleIndex] / 255;
    const height = 24 + value * canvas.height * 0.62 * (intensity / 72);
    const x = i * width;
    const color = colors[i % colors.length];

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.2 + value * 0.78;
    ctx.fillRect(x + gap / 2, baseline - height, Math.max(2, width - gap), height);

    ctx.globalAlpha = 0.12 + bass * 0.14;
    ctx.fillRect(x + gap / 2, baseline + 18, Math.max(2, width - gap), height * 0.42);
  }
}

function drawTunnel(colors, intensity, bass, mid) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const spokes = 80;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation * 0.012);
  for (let i = 0; i < spokes; i += 1) {
    const angle = (Math.PI * 2 * i) / spokes;
    const value = frequencyData[Math.floor((i / spokes) * frequencyData.length * 0.8)] / 255;
    const inner = 70 + bass * 180;
    const outer = inner + 140 + value * intensity * 5;

    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    ctx.strokeStyle = colors[i % colors.length];
    ctx.globalAlpha = 0.18 + value * 0.72;
    ctx.lineWidth = 1 + value * 7 + mid * 2;
    ctx.stroke();
  }
  ctx.restore();
}

function drawBloom(colors, intensity, bass, mid, treble) {
  const width = canvas.width;
  const height = canvas.height;
  const cx = width / 2;
  const cy = height / 2;
  const spokes = 128;
  const maxRadius = Math.min(width, height) * (0.34 + bass * 0.16);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation * 0.004);

  for (let i = 0; i < spokes; i += 1) {
    const value = frequencyData[Math.floor((i / spokes) * frequencyData.length * 0.66)] / 255;
    const angle = (i / spokes) * Math.PI * 2;
    const inner = maxRadius * (0.18 + mid * 0.06);
    const outer = inner + value * intensity * 4.2 + treble * 120;

    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    ctx.strokeStyle = colors[i % colors.length];
    ctx.globalAlpha = 0.16 + value * 0.62;
    ctx.lineWidth = 1 + value * 8;
    ctx.stroke();
  }

  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, maxRadius);
  core.addColorStop(0, colors[0] + "ee");
  core.addColorStop(0.35, colors[1] + "66");
  core.addColorStop(1, "transparent");
  ctx.globalAlpha = 0.58 + bass * 0.25;
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, maxRadius * (0.72 + bass * 0.22), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawParticles(colors, intensity, bass, mid, treble) {
  const width = canvas.width;
  const height = canvas.height;
  const count = 170;
  const drift = rotation * 0.002;

  ctx.save();
  for (let i = 0; i < count; i += 1) {
    const value = frequencyData[Math.floor((i / count) * frequencyData.length * 0.74)] / 255;
    const angle = i * 2.399963 + drift;
    const radius = Math.sqrt(i / count) * Math.min(width, height) * (0.56 + bass * 0.16);
    const wobble = Math.sin(rotation * 0.025 + i) * mid * 80;
    const x = width / 2 + Math.cos(angle) * (radius + wobble);
    const y = height / 2 + Math.sin(angle) * (radius + wobble);
    const dot = 2 + value * intensity * 0.12 + treble * 5;

    ctx.beginPath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.globalAlpha = 0.22 + value * 0.72;
    ctx.shadowColor = colors[i % colors.length];
    ctx.shadowBlur = 8 + value * 24;
    ctx.arc(x, y, dot, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawAlbumGlow(colors, intensity, bass, mid, treble) {
  const width = canvas.width;
  const height = canvas.height;
  const cx = width / 2;
  const cy = height / 2;
  const size = Math.min(width, height) * (0.34 + bass * 0.035);
  const bars = 88;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation * 0.002);

  const glow = ctx.createRadialGradient(0, 0, size * 0.2, 0, 0, size * 1.35);
  glow.addColorStop(0, colors[0] + "aa");
  glow.addColorStop(0.55, colors[1] + "44");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.globalAlpha = 0.78;
  ctx.fillRect(-size * 1.45, -size * 1.45, size * 2.9, size * 2.9);

  ctx.globalAlpha = 0.94;
  ctx.fillStyle = "#08090c";
  ctx.shadowColor = colors[0];
  ctx.shadowBlur = 28 + bass * 44;
  ctx.fillRect(-size / 2, -size / 2, size, size);

  const cover = ctx.createLinearGradient(-size / 2, -size / 2, size / 2, size / 2);
  cover.addColorStop(0, colors[0]);
  cover.addColorStop(0.5, colors[2]);
  cover.addColorStop(1, colors[1]);
  ctx.globalAlpha = 0.86;
  ctx.fillStyle = cover;
  ctx.fillRect(-size * 0.46, -size * 0.46, size * 0.92, size * 0.92);

  ctx.globalAlpha = 0.38 + mid * 0.28;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(2, width / 520);
  ctx.strokeRect(-size * 0.46, -size * 0.46, size * 0.92, size * 0.92);
  ctx.restore();

  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < bars; i += 1) {
    const value = frequencyData[Math.floor((i / bars) * frequencyData.length * 0.7)] / 255;
    const angle = (i / bars) * Math.PI * 2;
    const inner = size * 0.62;
    const outer = inner + 18 + value * intensity * 2.6 + treble * 55;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    ctx.strokeStyle = colors[i % colors.length];
    ctx.globalAlpha = 0.18 + value * 0.62;
    ctx.lineWidth = 2 + value * 7;
    ctx.stroke();
  }
  ctx.restore();
}

function drawSynthwave(colors, intensity, bass, mid, treble) {
  ctx.save();
  const width = canvas.width;
  const height = canvas.height;
  const horizon = height * 0.48;
  const centerX = width / 2;
  const pulse = 1 + bass * 0.18;

  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, "#14051f");
  sky.addColorStop(0.48, "#32125b");
  sky.addColorStop(1, "#090812");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, horizon + 2);

  const ground = ctx.createLinearGradient(0, horizon, 0, height);
  ground.addColorStop(0, "#090812");
  ground.addColorStop(1, "#060306");
  ctx.fillStyle = ground;
  ctx.fillRect(0, horizon, width, height - horizon);

  const sunRadius = Math.min(width, height) * (0.16 + bass * 0.035);
  const sunY = horizon - sunRadius * 0.25;
  const sunGradient = ctx.createRadialGradient(centerX, sunY, 0, centerX, sunY, sunRadius * pulse);
  sunGradient.addColorStop(0, colors[2]);
  sunGradient.addColorStop(0.46, "#ff7a45");
  sunGradient.addColorStop(1, colors[0] + "11");
  ctx.fillStyle = sunGradient;
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.arc(centerX, sunY, sunRadius * pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, sunY, sunRadius * pulse, 0, Math.PI * 2);
  ctx.clip();
  const stripeGradient = ctx.createLinearGradient(0, 0, 0, horizon);
  stripeGradient.addColorStop(0, "#14051f");
  stripeGradient.addColorStop(0.52, "#32125b");
  stripeGradient.addColorStop(1, "#090812");
  ctx.fillStyle = stripeGradient;
  ctx.globalAlpha = 0.98;
  const stripeCount = 9;
  const visibleSunRadius = sunRadius * pulse;
  for (let i = 0; i < stripeCount; i += 1) {
    const stripeY = sunY - visibleSunRadius * 0.6 + i * visibleSunRadius * 0.16 + bass * 16;
    const stripeH = visibleSunRadius * (0.04 + i * 0.009);
    ctx.fillRect(centerX - visibleSunRadius * 1.35, stripeY, visibleSunRadius * 2.7, stripeH);
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = colors[1];
  ctx.lineWidth = Math.max(1, width / 900);
  ctx.shadowColor = colors[1];
  ctx.shadowBlur = 18 + treble * 34;
  ctx.globalAlpha = 0.72;

  for (let i = 0; i < 28; i += 1) {
    const t = i / 27;
    const y = horizon + Math.pow(t, 2.25) * (height - horizon);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  for (let i = -18; i <= 18; i += 1) {
    const x = centerX + i * width * 0.052;
    ctx.beginPath();
    ctx.moveTo(centerX, horizon);
    ctx.lineTo(x + i * width * 0.38, height);
    ctx.stroke();
  }
  ctx.restore();

  drawSynthwaveMountains(colors, intensity, bass, mid, horizon);

  ctx.save();
  ctx.strokeStyle = colors[0];
  ctx.lineWidth = Math.max(2, width / 420);
  ctx.shadowColor = colors[0];
  ctx.shadowBlur = 20 + bass * 42;
  ctx.globalAlpha = 0.72 + bass * 0.2;
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  ctx.lineTo(width, horizon);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

function drawSynthwaveMountains(colors, intensity, bass, mid, horizon) {
  const width = canvas.width;
  const height = canvas.height;
  const ranges = [
    { base: horizon - height * 0.055, height: 0.12, color: "#100720", stroke: colors[3], offset: 0.018 },
    { base: horizon - height * 0.018, height: 0.18, color: "#090512", stroke: colors[0], offset: 0.032 },
  ];

  ranges.forEach((range, rangeIndex) => {
    const points = 96;
    const mountainHeight = height * range.height * (0.72 + bass * 0.42 + mid * 0.22) * (intensity / 72);

    ctx.save();
    ctx.shadowColor = range.stroke;
    ctx.shadowBlur = 18 + bass * 38;
    ctx.beginPath();
    ctx.moveTo(0, range.base);

    for (let i = 0; i <= points; i += 1) {
      const t = i / points;
      const sampleIndex = Math.floor(t * frequencyData.length * 0.58);
      const audioValue = frequencyData[sampleIndex] / 255;
      const ridge =
        Math.sin(t * Math.PI * 7 + rotation * range.offset) * 0.28 +
        Math.sin(t * Math.PI * 17 - rotation * range.offset * 1.7) * 0.12 +
        audioValue * 0.82;
      const x = t * width;
      const y = range.base - mountainHeight * (0.28 + Math.max(0, ridge));
      ctx.lineTo(x, y);
    }

    ctx.lineTo(width, horizon + height * 0.08);
    ctx.lineTo(0, horizon + height * 0.08);
    ctx.closePath();
    ctx.fillStyle = range.color;
    ctx.globalAlpha = rangeIndex === 0 ? 0.78 : 0.94;
    ctx.fill();

    ctx.globalAlpha = 0.72 + bass * 0.18;
    ctx.strokeStyle = range.stroke;
    ctx.lineWidth = Math.max(2, width / 520);
    ctx.stroke();
    ctx.restore();
  });
}

function drawWaveform(colors, treble) {
  if (analyser) {
    analyser.getByteTimeDomainData(timeData);
  }

  ctx.save();
  ctx.strokeStyle = colors[2];
  ctx.globalAlpha = 0.38 + treble * 0.32;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < timeData.length; i += 1) {
    const x = (i / (timeData.length - 1)) * canvas.width;
    const y = canvas.height * 0.5 + (timeData[i] / 128 - 1) * canvas.height * 0.22;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
  ctx.restore();
}

function drawTextOverlay(colors, bass) {
  const author = authorInput.value.trim();
  const title = titleInput.value.trim();

  if (!author && !title) {
    return;
  }

  const width = canvas.width;
  const height = canvas.height;
  const margin = Math.round(Math.min(width, height) * 0.055);
  const pulseScale = overlayPulse.checked ? 1 + textPulseLevel * (Number(overlayPulseAmount.value) / 100) : 1;
  const sizeScale = getOverlaySizeScale();
  const titleSize = Math.max(24, Math.round(width * 0.036 * sizeScale));
  const authorSize = Math.max(14, Math.round(width * 0.016 * sizeScale));
  const gap = Math.round(titleSize * 0.22);
  const position = overlayPosition.value;
  const isRight = position.endsWith("right");
  const isBottom = position.startsWith("bottom");
  const maxTextWidth = width * 0.42;
  const lines = [];

  if (title) {
    lines.push({ text: title, size: titleSize, weight: 800, color: "#f7fbff" });
  }

  if (author) {
    lines.push({ text: author, size: authorSize, weight: 650, color: colors[1] });
  }

  ctx.save();
  ctx.textAlign = isRight ? "right" : "left";
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0, 0, 0, 0.68)";
  ctx.shadowBlur = Math.max(12, width * 0.012);
  ctx.lineJoin = "round";

  let totalHeight = 0;
  let blockWidth = 0;
  lines.forEach((line, index) => {
    ctx.font = `${line.weight} ${line.size}px ${getOverlayFontFamily()}`;
    blockWidth = Math.max(blockWidth, Math.min(ctx.measureText(line.text).width, maxTextWidth));
    totalHeight += line.size * 1.08;
    if (index < lines.length - 1) {
      totalHeight += gap;
    }
  });

  const x = isRight ? width - margin : margin;
  let y = isBottom ? height - margin - totalHeight : margin;
  const blockLeft = isRight ? x - blockWidth : x;
  const blockCenterX = blockLeft + blockWidth / 2;
  const blockCenterY = y + totalHeight / 2;

  if (pulseScale !== 1) {
    ctx.translate(blockCenterX, blockCenterY);
    ctx.scale(pulseScale, pulseScale);
    ctx.translate(-blockCenterX, -blockCenterY);
  }

  lines.forEach((line, index) => {
    ctx.font = `${line.weight} ${line.size}px ${getOverlayFontFamily()}`;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.54)";
    ctx.lineWidth = Math.max(4, line.size * 0.12);
    ctx.strokeText(line.text, x, y, maxTextWidth);
    ctx.fillStyle = line.color;
    ctx.fillText(line.text, x, y, maxTextWidth);
    y += line.size * 1.08 + (index < lines.length - 1 ? gap : 0);
  });

  ctx.restore();
}

function getOverlayFontFamily() {
  const fonts = {
    inter: "'Inter', ui-sans-serif, system-ui, sans-serif",
    russo: "'Russo One', ui-sans-serif, system-ui, sans-serif",
    rubikMono: "'Rubik Mono One', ui-sans-serif, system-ui, sans-serif",
    unbounded: "'Unbounded', ui-sans-serif, system-ui, sans-serif",
    exo: "'Exo 2', ui-sans-serif, system-ui, sans-serif",
    play: "'Play', ui-sans-serif, system-ui, sans-serif",
    jura: "'Jura', ui-sans-serif, system-ui, sans-serif",
    comfortaa: "'Comfortaa', ui-sans-serif, system-ui, sans-serif",
    manrope: "'Manrope', ui-sans-serif, system-ui, sans-serif",
    montserratAlt: "'Montserrat Alternates', ui-sans-serif, system-ui, sans-serif",
    sofia: "'Sofia Sans Condensed', ui-sans-serif, system-ui, sans-serif",
    oswald: "'Oswald', ui-sans-serif, system-ui, sans-serif",
    robotoSlab: "'Roboto Slab', Georgia, serif",
    pressStart: "'Press Start 2P', ui-monospace, monospace",
    rubikGlitch: "'Rubik Glitch', ui-sans-serif, system-ui, sans-serif",
    kelly: "'Kelly Slab', ui-sans-serif, system-ui, sans-serif",
    amatic: "'Amatic SC', cursive",
    balsamiq: "'Balsamiq Sans', 'Comic Sans MS', cursive",
    pangolin: "'Pangolin', cursive",
    neucha: "'Neucha', cursive",
    badScript: "'Bad Script', cursive",
    marck: "'Marck Script', cursive",
    underdog: "'Underdog', cursive",
    comicSans: "'Comic Sans MS', 'Comic Sans', 'Comic Neue', cursive",
    system: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    mono: "'Courier New', ui-monospace, monospace",
    impact: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif",
  };

  return fonts[overlayFont.value] || fonts.inter;
}

function getOverlaySizeScale() {
  return Number(overlaySize.value) / 100;
}

function parseTrackMetadata(fileName) {
  const baseName = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/\s*\[[^\]]+\]\s*/g, " ")
    .replace(/\s*\([^)]*(official|audio|video|lyrics?|remaster|remix)[^)]*\)\s*/gi, " ")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const separators = [" - ", " – ", " — ", " | ", " -- "];
  const separator = separators.find((item) => baseName.includes(item));

  if (separator) {
    const [author, ...titleParts] = baseName.split(separator);
    const title = titleParts.join(separator).trim();
    if (author.trim() && title) {
      return { author: cleanTrackText(author), title: cleanTrackText(title) };
    }
  }

  const dashMatch = baseName.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (dashMatch) {
    return {
      author: cleanTrackText(dashMatch[1]),
      title: cleanTrackText(dashMatch[2]),
    };
  }

  return { author: "", title: cleanTrackText(baseName) };
}

function cleanTrackText(value) {
  return value
    .replace(/\b(official|audio|video|lyrics?|hd|hq|remaster(ed)?|visualizer)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function updateTextPulse(bass) {
  bassFollower = bassFollower * 0.78 + bass * 0.22;

  if (!overlayPulse.checked) {
    textPulseLevel *= 0.74;
    return;
  }

  const hit = bass > 0.16 && bass - bassFollower > 0.018;
  if (hit) {
    textPulseLevel = Math.min(1, 0.52 + bass * 1.25);
  } else {
    textPulseLevel *= 0.8;
  }
}

function render() {
  fitCanvas();
  animationId = requestAnimationFrame(render);
  clearCanvas();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.shadowBlur = 0;

  if (!analyser) {
    fillIdleAudioData();
  } else {
    analyser.getByteFrequencyData(frequencyData);
  }

  const colors = palettes[paletteSelect.value] || palettes.miami;
  const intensity = Number(intensityInput.value);
  const bass = getEnergy(0, 0.08);
  const mid = getEnergy(0.08, 0.34);
  const treble = getEnergy(0.34, 0.78);
  rotation += 0.65 + bass * 2.4;
  updateTextPulse(bass);

  if (!hasTrack) {
    drawBackground(colors, 0.08, 0.08);
    return;
  }

  drawBackground(colors, bass, mid);

  if (styleSelect.value === "bars") {
    drawBars(colors, intensity, bass);
  } else if (styleSelect.value === "tunnel") {
    drawTunnel(colors, intensity, bass, mid);
  } else if (styleSelect.value === "synthwave") {
    drawSynthwave(colors, intensity, bass, mid, treble);
  } else if (styleSelect.value === "bloom") {
    drawBloom(colors, intensity, bass, mid, treble);
  } else if (styleSelect.value === "particles") {
    drawParticles(colors, intensity, bass, mid, treble);
  } else if (styleSelect.value === "album") {
    drawAlbumGlow(colors, intensity, bass, mid, treble);
  } else {
    drawRings(colors, intensity, bass, mid, treble);
  }

  drawWaveform(colors, treble);
  maskBottomArtifact();
  drawTextOverlay(colors, bass);
}

async function playAudio() {
  await ensureAudioGraphRunning();

  if (audio.paused) {
    await audio.play();
    playButton.textContent = "Pause";
  } else {
    audio.pause();
    playButton.textContent = "Play";
  }
}

function getSupportedMimeType() {
  const options = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4;codecs=h264,aac",
    "video/mp4",
  ];

  const type = options.find((candidate) => MediaRecorder.isTypeSupported(candidate)) || "";
  exportMimeType = type || "video/webm";
  exportExtension = exportMimeType.includes("mp4") ? "mp4" : "webm";
  return type;
}

function getRecordingOptions(mimeType) {
  const quality = Number(qualitySelect.value);
  const bitrateByQuality = {
    720: 16_000_000,
    1080: 36_000_000,
    2160: 120_000_000,
  };

  exportVideoBitrate = bitrateByQuality[quality] || bitrateByQuality[720];

  return {
    ...(mimeType ? { mimeType } : {}),
    videoBitsPerSecond: exportVideoBitrate,
    audioBitsPerSecond: 256_000,
  };
}

async function startRecording() {
  await ensureAudioGraphRunning();

  downloadLink.hidden = true;
  recordedChunks = [];
  audio.currentTime = 0;
  fitCanvas();

  const canvasStream = canvas.captureStream(60);
  const audioCapture = audio.captureStream || audio.mozCaptureStream;
  if (!audioCapture || !window.MediaRecorder) {
    setStatus("This browser cannot record canvas and audio together. Try a current Chrome, Edge, or Safari build.");
    return;
  }

  const audioStream = audioCapture.call(audio);
  const outputStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioStream.getAudioTracks(),
  ]);

  const mimeType = getSupportedMimeType();
  const recordingOptions = getRecordingOptions(mimeType);
  try {
    recorder = new MediaRecorder(outputStream, recordingOptions);
  } catch (error) {
    recorder = new MediaRecorder(outputStream, mimeType ? { mimeType } : undefined);
    exportVideoBitrate = 0;
  }

  recorder.addEventListener("dataavailable", (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  });

  recorder.addEventListener("stop", () => {
    const blob = new Blob(recordedChunks, { type: exportMimeType });
    const url = URL.createObjectURL(blob);
    downloadLink.href = url;
    downloadLink.download = `${selectedFileName}-musvis.${exportExtension}`;
    downloadLink.hidden = false;
    recordButton.disabled = false;
    recordButton.textContent = "Record video";
    setStatus(
      `Export ready. Duration: ${Math.round((Date.now() - startedAt) / 1000)}s. Encoded as ${exportExtension.toUpperCase()}${exportVideoBitrate ? ` at about ${Math.round(exportVideoBitrate / 1_000_000)} Mbps` : ""}.`,
    );
  });

  audio.addEventListener("ended", stopRecording, { once: true });
  recorder.start(1000);
  startedAt = Date.now();
  recordButton.textContent = "Stop recording";
  recordButton.disabled = false;
  setStatus(
    `Recording ${canvas.width}x${canvas.height}${exportVideoBitrate ? ` at about ${Math.round(exportVideoBitrate / 1_000_000)} Mbps` : ""}. Playback will stop when the track ends.`,
  );
  await audio.play();
  playButton.textContent = "Pause";
}

function stopRecording() {
  if (recorder && recorder.state !== "inactive") {
    recorder.stop();
  }
}

function resetVisualFrame() {
  textPulseLevel = 0;
  bassFollower = 0;
  smoothedBass = 0;
  clearCanvas();
}

async function toggleFullscreen() {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }

  await stage.requestFullscreen();
}

audioFile.addEventListener("change", () => {
  const file = audioFile.files[0];
  if (!file) return;

  hasTrack = true;
  selectedFileName = file.name.replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "-").toLowerCase();
  const metadata = parseTrackMetadata(file.name);
  authorInput.value = metadata.author;
  titleInput.value = metadata.title;
  audio.src = URL.createObjectURL(file);
  trackMeta.textContent = file.name;
  emptyState.classList.add("is-hidden");
  playButton.disabled = false;
  recordButton.disabled = false;
  downloadLink.hidden = true;
  setStatus("Track loaded. Press Play to preview or Record video to export.");
});

audio.addEventListener("pause", () => {
  if (!recorder || recorder.state === "inactive") {
    playButton.textContent = "Play";
  }
});

audio.addEventListener("play", async () => {
  try {
    await ensureAudioGraphRunning();
    playButton.textContent = "Pause";
    if (hasTrack && (!recorder || recorder.state === "inactive")) {
      setStatus("Playing. Visuals are reacting to the audio.");
    }
  } catch (error) {
    setStatus("Could not connect the visualizer to this audio playback. Try the Play button.");
  }
});

audio.addEventListener("ended", () => {
  playButton.textContent = "Play";
});

playButton.addEventListener("click", playAudio);
recordButton.addEventListener("click", () => {
  if (recorder && recorder.state === "recording") {
    stopRecording();
    audio.pause();
    return;
  }

  startRecording();
});
fullscreenButton.addEventListener("click", async () => {
  try {
    await toggleFullscreen();
  } catch (error) {
    setStatus("Full screen is not available in this browser context.");
  }
});
document.addEventListener("fullscreenchange", () => {
  fullscreenButton.textContent = document.fullscreenElement ? "Exit full screen" : "Full screen preview";
  resetVisualFrame();
});
styleSelect.addEventListener("change", resetVisualFrame);
paletteSelect.addEventListener("change", resetVisualFrame);
qualitySelect.addEventListener("change", () => {
  fitCanvas();
  resetVisualFrame();
});
aspectSelect.addEventListener("change", () => {
  fitCanvas();
  resetVisualFrame();
});
intensityInput.addEventListener("input", () => {
  intensityValue.textContent = intensityInput.value;
});
overlaySize.addEventListener("input", () => {
  overlaySizeValue.textContent = `${overlaySize.value}%`;
});
overlayPulseAmount.addEventListener("input", () => {
  overlayPulseValue.textContent = `${overlayPulseAmount.value}%`;
});

fitCanvas();
render();
