const PAGE_URL = 'https://akienmain.github.io/bezierizer/';
const defaultBgImage = 'bgimage0.jpg';
const C_OUT_TRUE = '#222';
const C_OUT_FALSE = '#bbb';
const C_IN_TRUE = '#2ecc40';
const C_IN_FALSE = '#e74c3c';
const C_BEZIER = '#0074d9';
const anchorCountMin = 3;
const anchorCountMax = 16;
const canvasW = 600;
const canvasH = 600;
const anchorRadius = 16;
const handleRadius = 8;
const dotRadius = 4;
const N = 64;
const bezierPolyNum = 40;
const mode = {
  single: 'single',
  multi: 'multi'
};

let anchorCount = 6;
let anchors = [];
let handles = [];
let handleLines = [];
let draggingAnchor = null;
let draggingHandle = null;
let dragType = null;
let offset = { x: 0, y: 0 };
let center = { x: canvasW / 2, y: canvasH / 2 };
let radius = canvasW / 3;
let moveCount = 0;
let score = 0.0;
let anchorPos = [];
let handlePos = [];
let currentMode = mode.single;
let isHost = true;





// Share button logic
document.addEventListener('DOMContentLoaded', function () {
  // Disable editor until mode is selected
  editor.style.display = 'none';
  modeSelectModal.show();
});
// Drag and drop import
document.addEventListener('dragover', function (e) {
  e.preventDefault();
});
document.addEventListener('mousemove', dragMove);
document.addEventListener('touchmove', dragMove, { passive: false });
document.addEventListener('mouseup', dragEnd);
document.addEventListener('touchend', dragEnd, { passive: false });

const editor = document.getElementById('editor');

// Show mode select dialog
const modeSelectModal = new bootstrap.Modal(document.getElementById('modeSelectModal'), { backdrop: 'static', keyboard: false });
modeSelectModal.show();

const singleModeBtn = document.getElementById('singleModeBtn');
function handleModeBtn(e, modeType) {
  e.preventDefault();
  e.stopPropagation();
  if (modeType === 'single') {
    currentMode = mode.single;
    editor.style.display = '';
    mpDiv.style.display = 'none';
    modeSelectModal.hide();
    fetch(defaultBgImage)
      .then(response => response.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onload = function (ev) {
          renderMosaic(ev.target.result);
        };
        reader.readAsDataURL(blob);
      });
  } else if (modeType === 'multi') {
    currentMode = mode.multi;
    editor.style.display = '';
    importFigureBtn.style.display = 'none';
    importBGBtn.style.display = 'none';
    commonDiv.style.display = 'none';
    modeSelectModal.hide();
    if (typeof setupMultiplayerUI === 'function') setupMultiplayerUI();
  }
}

singleModeBtn.addEventListener('click', e => handleModeBtn(e, 'single'));
singleModeBtn.addEventListener('touchend', e => handleModeBtn(e, 'single'));
multiModeBtn.addEventListener('click', e => handleModeBtn(e, 'multi'));
multiModeBtn.addEventListener('touchend', e => handleModeBtn(e, 'multi'));


const importBGBtn = document.getElementById('importBGBtn');
importBGBtn.onclick = function () {
  importBGInput.value = '';
  importBGInput.click();
};

const importBGInput = document.getElementById('importBGInput');
importBGInput.addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;
  if (!/\.(jpe?g|png)$/i.test(file.name)) {
    showToast('Only .jpg/.png allowed', false);
    return;
  }
  importImage(file);
});

const importFigureBtn = document.getElementById('importFigureBtn');
importFigureBtn.onclick = function () {
  importFigureInput.value = '';
  importFigureInput.click();
};

const importFigureInput = document.getElementById('importFigureInput');
importFigureInput.addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;
  importJson(file);
});

const exportFigureBtn = document.getElementById('exportFigureBtn');
exportFigureBtn.onclick = function () {
  const data = {
    anchorPos: anchorPos,
    handlePos: handlePos
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'figure.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const exportSvgBtn = document.getElementById('exportSvgBtn');
exportSvgBtn.onclick = function () {
  let source = getMinimalSVG();
  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'image.svg';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const copyPngBtn = document.getElementById('copyPngBtn');
copyPngBtn.onclick = function () {
  let source = getMinimalSVG();
  const svg64 = btoa(unescape(encodeURIComponent(source)));
  const image64 = 'data:image/svg+xml;base64,' + svg64;
  const img = new window.Image();
  img.crossOrigin = 'anonymous';
  img.onload = function () {
    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    canvas.toBlob(blob => {
      if (navigator.clipboard && window.ClipboardItem && window.isSecureContext) {
        const item = new ClipboardItem({ 'image/png': blob });
        navigator.clipboard.write([item]).then(() => {
          showToast('PNG copied to clipboard!', true);
        }, () => {
          showToast('Failed to copy PNG.', false);
        });
      } else {
        showToast('Clipboard API not available. Right-click and save image.', false);
      }
    }, 'image/png');
  };
  img.src = image64;
};

const shareBtn = document.getElementById('shareBtn');
shareBtn.addEventListener('click', function () {
  shareModal.show();
});

const shareModal = new bootstrap.Modal(document.getElementById('shareModal'));

const shareXBtn = document.getElementById('shareXBtn');
shareXBtn.onclick = function () {
  const url = `https://x.com/intent/tweet?text=[Bezierizer] Scored ${score} pts. (${anchorCount} anchors)&url=${PAGE_URL}`;
  window.open(url, "_blank");
};

const canvasDiv = document.getElementById('canvasDiv');
canvasDiv.style.width = `${canvasW}px`;
canvasDiv.style.height = `${canvasH}px`;

const bgCanvas = document.getElementById('bgCanvas');
bgCanvas.setAttribute('width', canvasW);
bgCanvas.setAttribute('height', canvasH);

const bgCtx = bgCanvas.getContext('2d');

const svg = document.getElementById('svg');
svg.setAttribute('width', canvasW);
svg.setAttribute('height', canvasH);
svg.addEventListener('mousedown', dragStart);
svg.addEventListener('touchstart', dragStart, { passive: false });
svg.addEventListener('drop', function (e) {
  e.preventDefault();
  if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
  if (currentMode == mode.multi) return;
  const file = e.dataTransfer.files[0];
  if (/\.(jpe?g|png)$/i.test(file.name)) {
    importImage(file);
  } else if (file.name.endsWith('.json')) {
    importJson(file);
  } else {
    showToast('Only .jpg/.png/.json allowed', false);
  }
});

const mainBezier = document.getElementById('mainBezier');

const anchorsDiv = document.getElementById('anchorsDiv');

const anchorSlider = document.getElementById('anchorCountSlider');
anchorSlider.value = anchorCount;
anchorSlider.min = anchorCountMin;
anchorSlider.max = anchorCountMax;
anchorSlider.addEventListener('input', e => updateAnchorCount(e.target.value));

const anchorInput = document.getElementById('anchorCountInput');
anchorInput.value = anchorCount;
anchorInput.min = anchorCountMin;
anchorInput.max = anchorCountMax;
anchorInput.addEventListener('input', e => updateAnchorCount(e.target.value));

const showScore = document.getElementById('showScore');
const showMoveCount = document.getElementById('showMoveCount');
const commonDiv = document.getElementById('commonDiv');

recalcPoints();
redraw();

/////////////////////////////////////////////////////////////////

function updateAnchorCount(val) {
  anchorCount = Math.max(anchorCountMin, Math.min(anchorCountMax, parseInt(val)));
  anchorSlider.value = anchorCount;
  anchorInput.value = anchorCount;
  moveCount = 0;
  recalcPoints();
  redraw();
}

// kappa for circle approximation
function getKappa(count) {
  return 4 / 3 * Math.tan(2 * Math.PI / count / 4);
}

function recalcPoints() {
  const kappa = getKappa(anchorCount);
  anchorPos = [];
  handlePos = [];
  for (let i = 0; i < anchorCount; ++i) {
    const theta = (i / anchorCount) * 2 * Math.PI;
    const x = center.x + radius * Math.cos(theta);
    const y = center.y + radius * Math.sin(theta);
    anchorPos[i] = { x, y };
    // Handles: place on tangent, length = kappa*radius
    const tangent = theta + Math.PI / 2;
    const hx1 = x + kappa * radius * Math.cos(tangent);
    const hy1 = y + kappa * radius * Math.sin(tangent);
    const hx2 = x - kappa * radius * Math.cos(tangent);
    const hy2 = y - kappa * radius * Math.sin(tangent);
    handlePos[i] = [{ x: hx1, y: hy1 }, { x: hx2, y: hy2 }];
  }
}

function createOrUpdateSVG() {
  // Remove old anchors/handles/lines
  for (let j = 0; j < anchorCountMax; ++j) {
    if (anchors[j]) svg.removeChild(anchors[j]);
    for (let i = 0; i < 2; ++i) {
      if (handles[j] && handles[j][i]) svg.removeChild(handles[j][i]);
      if (handleLines[j] && handleLines[j][i]) svg.removeChild(handleLines[j][i]);
    }
  };
  anchors = []; handles = []; handleLines = [];

  if (!isHost) document.getElementById('mainBezier').style.visibility = "hidden";
  else document.getElementById('mainBezier').style.visibility = "visible";

  if (!isHost) return;
  // Draw anchors, handles, and lines
  for (let j = 0; j < anchorCount; ++j) {
    // Handle Line
    let hl = [];
    for (let i = 0; i < 2; ++i) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('class', 'handle-line');
      line.setAttribute('x1', anchorPos[j].x);
      line.setAttribute('y1', anchorPos[j].y);
      line.setAttribute('x2', handlePos[j][i].x);
      line.setAttribute('y2', handlePos[j][i].y);
      svg.appendChild(line);
      hl.push(line);
    }
    handleLines.push(hl);
    // Anchor
    const anchor = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    anchor.setAttribute('class', 'anchor');
    anchor.setAttribute('cx', anchorPos[j].x);
    anchor.setAttribute('cy', anchorPos[j].y);
    anchor.setAttribute('r', anchorRadius);
    svg.appendChild(anchor);
    anchors.push(anchor);

    // Handles
    let h = [];
    for (let i = 0; i < 2; ++i) {
      const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      handle.setAttribute('class', 'handle');
      handle.setAttribute('cx', handlePos[j][i].x);
      handle.setAttribute('cy', handlePos[j][i].y);
      handle.setAttribute('r', handleRadius);
      svg.appendChild(handle);
      h.push(handle);
    }
    handles.push(h);
  }
}

function updateBezierPath() {
  const p = anchorPos, c = handlePos;
  let d = `M ${p[0].x} ${p[0].y} `;
  for (let j = 0; j < anchorCount; ++j) {
    const jNext = (j + 1) % anchorCount;
    d += `C ${c[j][0].x} ${c[j][0].y}, ${c[jNext][1].x} ${c[jNext][1].y}, ${p[jNext].x} ${p[jNext].y}`;
    if (j < anchorCount - 1) d += ' ';
  }
  mainBezier.setAttribute('d', d);
}

function redraw() {
  createOrUpdateSVG();
  updateBezierPath();
  drawDots();
  updatePointsSection();
  showMoveCount.textContent = `Move Count ${moveCount}`;
  if (currentMode == mode.multi) showMoveCount.textContent += ` / ${moveCountLimit}`;
}

function getMousePos(evt) {
  const rect = svg.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top
  };
}

// Draw NxN dots behind everything
// Helper: Evaluate cubic Bézier at t
function cubicAt(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

// Helper: Get polygon points from Bezier
function getBezierPolygon(numSeg) {
  const pts = [];
  const p = anchorPos, c = handlePos;
  const segs = [];
  for (let j = 0; j < anchorCount; ++j) {
    const jNext = (j + 1) % anchorCount;
    segs.push([p[j], c[j][0], c[jNext][1], p[jNext]]);
  };
  for (const seg of segs) {
    for (let i = 0; i < numSeg; ++i) {
      const t = i / numSeg;
      pts.push({
        x: cubicAt(seg[0].x, seg[1].x, seg[2].x, seg[3].x, t),
        y: cubicAt(seg[0].y, seg[1].y, seg[2].y, seg[3].y, t)
      });
    }
  }
  return pts;
}

// Helper: Winding number test
function windingTest(x, y, poly) {
  let wn = 0;
  for (let i = 0; i < poly.length; ++i) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    if (a.y <= y) {
      if (b.y > y && ((b.x - a.x) * (y - a.y) - (x - a.x) * (b.y - a.y)) > 0) wn++;
    } else {
      if (b.y <= y && ((b.x - a.x) * (y - a.y) - (x - a.x) * (b.y - a.y)) < 0) wn--;
    }
  }
  return wn !== 0;
}

function drawDots() {
  // Remove old dots
  Array.from(svg.querySelectorAll('.dot')).forEach(dot => svg.removeChild(dot));
  const poly = getBezierPolygon(bezierPolyNum);
  // let mosaicCtx = null;
  let mosaicOn = false;
  if (bgCanvas && bgCanvas.style.display !== 'none') {
    // mosaicCtx = bgCanvas.getContext('2d');
    mosaicOn = true;
  }
  for (let i = 0; i < N; ++i) {
    for (let j = 0; j < N; ++j) {
      const x = (i + 0.5) * (canvasW / N);
      const y = (j + 0.5) * (canvasH / N);
      const inside = windingTest(x, y, poly);
      let fill = C_OUT_FALSE;
      if (inside && mosaicOn) {
        const pixel = bgCtx.getImageData(i, j, 1, 1).data;
        const cell = pixel[0];
        if (!isHost) fill = C_OUT_TRUE;
        else fill = cell <= 127 ? C_IN_TRUE : C_IN_FALSE;
      } else if (inside) {
        if (!isHost) fill = C_OUT_TRUE;
        else fill = C_IN_FALSE;
      } else if (!inside && mosaicOn) {
        const pixel = bgCtx.getImageData(i, j, 1, 1).data;
        const cell = pixel[0];
        if (!isHost) fill = C_OUT_FALSE;
        else fill = cell <= 127 ? C_OUT_TRUE : C_OUT_FALSE;
      }

      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('class', 'dot');
      dot.setAttribute('cx', x);
      dot.setAttribute('cy', y);
      dot.setAttribute('r', dotRadius);
      dot.setAttribute('fill', fill);
      dot.setAttribute('pointer-events', 'none');
      svg.insertBefore(dot, svg.firstChild);
    }
  }
}

// --- Points calculation and display ---
function updatePointsSection() {
  if (currentMode == mode.multi && !isHost) {
  } else {
    const poly = getBezierPolygon(bezierPolyNum);
    // let mosaicCtx = null;
    let mosaicOn = false;
    if (bgCanvas && bgCanvas.style.display !== 'none') {
      // mosaicCtx = bgCanvas.getContext('2d');
      mosaicOn = true;
    }
    let numerator = 0, denominator = 0;
    for (let i = 0; i < N; ++i) {
      for (let j = 0; j < N; ++j) {
        const x = (i + 0.5) * (canvasW / N);
        const y = (j + 0.5) * (canvasH / N);
        const inside = windingTest(x, y, poly);
        let inBezier = inside;
        let inMosaic = false;
        if (mosaicOn) {
          const pixel = bgCtx.getImageData(i, j, 1, 1).data;
          inMosaic = pixel[0] <= 127;
        }
        // Numerator: green dots (inside bezier AND inside mosaic)
        if (inBezier && inMosaic) numerator++;
        // Denominator: green, blue, or red dots (inside bezier OR inside mosaic)
        if (inBezier || inMosaic) denominator++;
      }
    }
    let jaccard = denominator === 0 ? 0 : numerator / denominator;
    score = (jaccard * 100).toFixed(1);
  }
  showScore.textContent = `${score} %`;
}

// --- Copy PNG/SVG logic ---
// Remove duplicate and broken handlers, use only the robust ones below
// Toast UI
function showToast(msg, success = true) {
  const toastContainer = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-bg-${success ? 'success' : 'danger'} border-0 show mb-2`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  toast.innerHTML = `<div class="d-flex"><div class="toast-body">${msg}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`;
  toastContainer.appendChild(toast);
  setTimeout(() => { toast.classList.remove('show'); toast.remove(); }, 2000);
}

// --- Import Image logic ---
function renderMosaic(imgSrc, binaryMode = false) {
  const ctx = bgCanvas.getContext('2d');
  const img = new window.Image();
  img.onload = function () {
    // Draw image resized to NxN
    ctx.clearRect(0, 0, N, N);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, N, N);
    // Get image data
    const imgData = ctx.getImageData(0, 0, N, N);
    // Create binary mosaic
    for (let y = 0; y < N; ++y) {
      for (let x = 0; x < N; ++x) {
        const idx = (y * N + x) * 4;
        const r = imgData.data[idx];
        const g = imgData.data[idx + 1];
        const b = imgData.data[idx + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        let val = gray > 127 ? 255 : 0;
        if (binaryMode) val = imgData.data[idx] == 1 ? 255 : 0;
        imgData.data[idx] = imgData.data[idx + 1] = imgData.data[idx + 2] = val;
        imgData.data[idx + 3] = 255;
      }
    }
    bgCanvas.style.display = 'block';
    redraw();
  };
  img.src = imgSrc;
};

function importImage(file) {
  const reader = new FileReader();
  reader.onload = function (ev) {
    renderMosaic(ev.target.result);
  };
  reader.readAsDataURL(file);
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = function (evt) {
    try {
      const data = JSON.parse(evt.target.result);
      if (!data.anchorPos || !data.handlePos) throw new Error('Invalid structure');
      anchorPos = data.anchorPos;
      handlePos = data.handlePos;
      anchorCount = anchorPos.length;
      anchorSlider.value = anchorCount;
      anchorInput.value = anchorCount;
      redraw();
    } catch (err) {
      showToast('Invalid JSON file.', false);
    }
  };
  reader.readAsText(file);
}

// Helper: create SVG string with only dots and bezier
function getMinimalSVG() {
  const w = svg.width.baseVal.value;
  const h = svg.height.baseVal.value;
  // Get dots
  const dots = Array.from(svg.querySelectorAll('.dot')).map(dot => dot.outerHTML).join('');
  // Get bezier
  const mainBezier = document.getElementById('mainBezier');
  mainBezier.setAttribute('fill', 'none');
  mainBezier.setAttribute('stroke', C_BEZIER);
  mainBezier.setAttribute('stroke-width', '3');
  const bezier = mainBezier.outerHTML;
  return `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>${dots}${bezier}</svg>`;
}

// Drag logic
// Mouse and touch start
function dragStart(evt) {
  if (currentMode == mode.multi && moveCount >= moveCountLimit) return;
  let isTouch = evt.type.startsWith('touch');
  let e = isTouch ? evt.touches[0] : evt;
  const pos = getMousePos(e);
  // Check handles
  for (let j = 0; j < anchorCount; ++j) {
    for (let i = 0; i < 2; ++i) {
      const h = handles[j][i];
      const dx = pos.x - handlePos[j][i].x, dy = pos.y - handlePos[j][i].y;
      if (dx * dx + dy * dy < handleRadius * handleRadius) {
        draggingAnchor = j;
        draggingHandle = i;
        dragType = 'handle';
        h.classList.add('active');
        offset.x = pos.x - handlePos[j][i].x;
        offset.y = pos.y - handlePos[j][i].y;
        evt.preventDefault();
        return;
      }
    }
  }
  // Check anchors
  for (let j = 0; j < anchorCount; ++j) {
    const a = anchors[j];
    const dx = pos.x - anchorPos[j].x, dy = pos.y - anchorPos[j].y;
    if (dx * dx + dy * dy < anchorRadius * anchorRadius) {
      draggingAnchor = j;
      dragType = 'anchor';
      a.classList.add('active');
      offset.x = pos.x - anchorPos[j].x;
      offset.y = pos.y - anchorPos[j].y;
      evt.preventDefault();
      return;
    }
  }
}

// Mouse and touch move
function dragMove(evt) {
  if (dragType === null) return;
  let isTouch = evt.type.startsWith('touch');
  let e = isTouch ? (evt.touches[0] || evt.changedTouches[0]) : evt;
  const pos = getMousePos(e);
  const j = draggingAnchor;
  const i = draggingHandle;
  if (dragType === 'anchor') {
    const currentX = anchorPos[j].x;
    const currentY = anchorPos[j].y;
    let newX = pos.x - offset.x;
    let newY = pos.y - offset.y;
    newX = Math.max(0, Math.min(canvasW, newX));
    newY = Math.max(0, Math.min(canvasH, newY));
    anchorPos[j].x = newX;
    anchorPos[j].y = newY;
    handlePos[j][0].x += newX - currentX;
    handlePos[j][0].y += newY - currentY;
    handlePos[j][1].x += newX - currentX;
    handlePos[j][1].y += newY - currentY;
    offset.x = pos.x - anchorPos[j].x;
    offset.y = pos.y - anchorPos[j].y;
  } else if (dragType === 'handle') {
    handlePos[j][i].x = pos.x - offset.x;
    handlePos[j][i].y = pos.y - offset.y;
    const ax = anchorPos[j].x;
    const ay = anchorPos[j].y;
    const dx = handlePos[j][i].x - ax;
    const dy = handlePos[j][i].y - ay;
    const opp = i === 0 ? 1 : 0;
    handlePos[j][opp].x = ax - dx;
    handlePos[j][opp].y = ay - dy;
    offset.x = pos.x - handlePos[j][i].x;
    offset.y = pos.y - handlePos[j][i].y;
  }
  redraw();
  if (isTouch) evt.preventDefault();
}

// Mouse and touch end
function dragEnd(evt) {
  if (dragType !== null) {
    const j = draggingAnchor;
    const i = draggingHandle;
    if (dragType === 'anchor') anchors[j].classList.remove('active');
    else if (dragType === 'handle') handles[j][i].classList.remove('active');
    moveCount = moveCount + 1;
    redraw();
    draggingAnchor = null;
    draggingHandle = null;
    dragType = null;
  }
  if (evt.type.startsWith('touch')) evt.preventDefault();
}