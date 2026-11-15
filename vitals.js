const heartRateValue = document.getElementById("heart-rate-value");
const pulseWave = document.getElementById("pulse-wave");

if (!heartRateValue || !pulseWave) {
  throw new Error("No se encontró el monitor de signos vitales.");
}

const svgWidth = 200;
const traceDuration = 2400;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let heartRate = 72;
let animationFrameId = 0;

function wavePeak(phase, center, width, height) {
  const distance = (phase - center) / width;
  return height * Math.exp(-(distance * distance));
}

function drawWaveform(timestamp) {
  const beatDuration = 60000 / heartRate;
  const points = [];

  for (let x = 0; x <= svgWidth; x += 2) {
    const sampleTime = timestamp - ((svgWidth - x) / svgWidth) * traceDuration;
    const phase = ((sampleTime % beatDuration) + beatDuration) % beatDuration / beatDuration;
    const signal =
      wavePeak(phase, 0.17, 0.035, 0.13) +
      wavePeak(phase, 0.385, 0.012, -0.16) +
      wavePeak(phase, 0.405, 0.012, 1) +
      wavePeak(phase, 0.43, 0.015, -0.25) +
      wavePeak(phase, 0.68, 0.07, 0.28);

    points.push(`${x === 0 ? "M" : "L"}${x} ${(12 - signal * 9).toFixed(2)}`);
  }

  pulseWave.setAttribute("d", points.join(" "));
}

function animateWaveform(timestamp) {
  drawWaveform(timestamp);

  if (!prefersReducedMotion.matches) {
    animationFrameId = requestAnimationFrame(animateWaveform);
  } else {
    animationFrameId = 0;
  }
}

function updateHeartRate() {
  let nextRate = Math.floor(Math.random() * 51) + 50;
  if (nextRate === heartRate) {
    nextRate = nextRate === 100 ? 50 : nextRate + 1;
  }

  heartRate = nextRate;
  heartRateValue.textContent = String(heartRate);
}

prefersReducedMotion.addEventListener("change", (event) => {
  if (event.matches) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = 0;
    drawWaveform(performance.now());
  } else if (!animationFrameId) {
    animationFrameId = requestAnimationFrame(animateWaveform);
  }
});

animationFrameId = requestAnimationFrame(animateWaveform);
window.setInterval(updateHeartRate, 4500);
