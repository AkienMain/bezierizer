// PeerJS Multiplayer logic for index.html
// Handles host/peer connection, sync, and game state

const bgImageNumber = 4;
const hostBgIndexInitial = 9999;
const defaultBgImageMulti = [
  'bgimage0.jpg',
  'bgimage1.jpg',
  'bgimage2.jpg',
  'bgimage3.jpg'
];
let peer = null;
let conn = null;
let peerId = null;
let peerIdPartner = null;
let moveSyncEnabled = false;
let hostBgIndex = hostBgIndexInitial;
let moveCountLimit = 5;
let bgImages = [];

// Load default images for multiplayer
function preloadDefaultBgImages() {
  if (typeof defaultBgImageMulti !== 'undefined') {
    const promises = defaultBgImageMulti.slice(0, bgImageNumber).map((imgName) => {
      return fetch(imgName)
        .then(r => r.blob())
        .then(blob => new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = function (ev) {
            convertImageToBinaryArray(ev.target.result, arr => {
              resolve(arr);
            });
          };
          reader.readAsDataURL(blob);
        }));
    });
    Promise.all(promises).then(arrays => {
      bgImages = arrays;
      renderBgButtons();
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof defaultBgImageMulti !== 'undefined') preloadDefaultBgImages();
});
let bgImageData = [];

peer = new Peer(Math.floor(100000 + Math.random() * 900000).toString());
peer.on('open', id => {
  peerId = id;
  myPeerId.textContent = id;
});
peer.on('connection', c => {
  conn = c;
  moveSyncEnabled = true;
  showToast('Connected.');
  sendHostState();
  conn.on('data', onPeerData);
  peerIdPartner = conn.peer;
  partnersPeerId.textContent = peerIdPartner;

  isHost = true;
  peerPanel.style.display = 'none';
  hostPanel.style.display = '';
});
peer.on('error', (err) => {
  if (err.type === 'unavailable-id') {
    peer.destroy();
    peer = new Peer(Math.floor(100000 + Math.random() * 900000).toString());
  }
});

document.addEventListener('DOMContentLoaded', renderBgButtons);

const mpDiv = document.getElementById('multiplayerDiv');
const bgBtns = document.getElementById('bgImageButtons');
const hostPanel = document.getElementById('hostPanel');
const peerPanel = document.getElementById('peerPanel');
const myPeerId = document.getElementById('myPeerId');
const partnersPeerId = document.getElementById('partnersPeerId');
const peerIdInput = document.getElementById('peerIdInput');
const mpMsg = document.getElementById('mpMsg');
const addBgDiv = document.getElementById('addBgDiv');
const addBgMsg = document.getElementById('addBgMsg');

const addBgBtn = document.getElementById('addBgBtn');
addBgBtn.onclick = () => {
  if (bgImages.length >= bgImageNumber) return;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.jpg,.jpeg,.png';
  input.multiple = true;
  input.onchange = e => {
    const files = e.target.files;
    importBgImage(files);
  };
  input.click();
};

const bgDropArea = document.getElementById('bgDropArea');
bgDropArea.ondragover = e => { e.preventDefault(); };
bgDropArea.ondrop = e => {
  e.preventDefault();
  if (bgImages.length >= bgImageNumber) return;
  const files = Array.from(e.dataTransfer.files);
  importBgImage(files);
};

const connectBtn = document.getElementById('connectBtn');
connectBtn.onclick = () => {
  const id = peerIdInput.value;
  if (!id) return;
  conn = peer.connect(id);
  conn.on('open', () => {
    moveSyncEnabled = true;
    showToast('Connected.');
    isHost = false;
    peerPanel.style.display = 'none';
    hostPanel.style.display = 'none';
    redraw();
  });
  conn.on('data', onPeerData);
  peerIdPartner = id;
  partnersPeerId.textContent = peerIdPartner;
  anchorsDiv.style.setProperty('display', 'none', 'important');
};

const guessDiv = document.getElementById('guessDiv');
const guessImgBtns = document.getElementById('guessImgBtns');

function setupMultiplayerUI() {
  renderBgButtons();
}

function renderBgButtons() {
  addBgMsg.innerHTML = `Backgrounds (${bgImages.length} / ${bgImageNumber}): `;
  if (bgImages.length === 0) return;
  bgBtns.innerHTML = '';
  bgImageData = [];
  bgImages.slice(0, bgImageNumber).forEach((img, i) => {
    const {dataUrl, imageData} = convertImageArrayToUrlAndImageData(img);
    const btn = createImageButton(dataUrl);
    bgImageData.push(imageData);
    btn.onclick = () => {
      if (isHost && bgImages.length === bgImageNumber) {
        hostBgIndex = i;
        bgCtx.putImageData(bgImageData[i], 0, 0);
        bgCanvas.style.display = 'block';
        commonDiv.style.display = '';
        redraw();
        sendHostState();
      }
    };

    // Add delete button next to image button
    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-outline-danger p-0';
    delBtn.style.width = '64px';
    delBtn.style.height = '24px';
    delBtn.innerHTML = '<i class="bi bi-trash"></i>';
    delBtn.title = 'Delete image';
    delBtn.onclick = () => {
      bgImages.splice(i, 1);
      renderBgButtons();
      addBgDiv.style.display = '';
      addBgMsg.innerHTML = `Backgrounds (${bgImages.length} / ${bgImageNumber}): `;
    };

    const btnGroup = document.createElement('div');
    btnGroup.className = 'd-flex flex-column align-items-center';
    btnGroup.appendChild(btn);
    btnGroup.appendChild(delBtn);
    bgBtns.appendChild(btnGroup);
  });

  if (bgImages.length >= bgImageNumber) {
    addBgMsg.innerHTML = 'Choose background';
    addBgDiv.style.display = 'none';
  }
}

function convertImageArrayToUrlAndImageData(imageArray) {
  const canvas = document.createElement("canvas");
  canvas.width = N;
  canvas.height = N;
  const ctx = canvas.getContext("2d");
  const imageData = ctx.createImageData(N, N);
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const value = imageArray[i][j] === 1 ? 255 : 0;
      const index = (i * N + j) * 4;
      imageData.data[index]     = value; // R
      imageData.data[index + 1] = value; // G
      imageData.data[index + 2] = value; // B
      imageData.data[index + 3] = 255;   // Alpha
    }
  }
  ctx.putImageData(imageData, 0, 0);
  const dataUrl = canvas.toDataURL();
  return {dataUrl,  imageData};
}

document.getElementById('copyPeerIdBtn').onclick = () => {
  const id = myPeerId.textContent;
  navigator.clipboard.writeText(id);
};

function sendHostState() {
  if (conn && conn.open) {
    conn.send({
      type: 'hostState',
      hostBgIndex,
      anchorPos,
      handlePos,
      moveCount,
      bgImages,
      anchorCount,
      score
    });
  }
}

function onPeerData(data) {
  if (data.type === 'hostState') {
    hostBgIndex = data.hostBgIndex;
    anchorPos = data.anchorPos;
    handlePos = data.handlePos;
    moveCount = data.moveCount;
    bgImages = data.bgImages;
    if (anchorCount != data.anchorCount) {
      anchorCount = data.anchorCount;
      updateAnchorCount(anchorCount);
    }
    score = data.score;

    if (moveCount >= moveCountLimit && guessImgBtns.children.length < bgImageNumber) showGuessPanel();
    if (!isHost && hostBgIndex != hostBgIndexInitial) commonDiv.style.display = '';
    redraw();
  }
}

function showGuessPanel() {
  mpMsg.textContent = 'Which is correct?';
  bgImages.slice(0, bgImageNumber).forEach((img, index) => {
    const {dataUrl, _} = convertImageArrayToUrlAndImageData(img);
    const btn = createImageButton(dataUrl);
    btn.onclick = () => {
      mpMsg.textContent = (index === hostBgIndex) ? 'Correct!' : 'Failed';
      mpMsg.classList.add((index === hostBgIndex) ? 'text-success' : 'text-danger');
      mpMsg.style.fontWeight = 'bold';
      for (let i = 0; i < guessImgBtns.children.length; i++) {
        if (i !== hostBgIndex) {
          guessImgBtns.children[i].classList.remove('btn-outline-primary');
          guessImgBtns.children[i].classList.add(
            (btn == guessImgBtns.children[i]) ? 'btn-outline-danger' : 'btn-outline-secondary'
          );
          guessImgBtns.children[i].style.opacity = '0.5';
        }
      }
    };
    guessImgBtns.appendChild(btn);
  });
  mpDiv.appendChild(guessDiv);
}

function createImageButton(dataUrl) {
  const btn = document.createElement('button');
  btn.className = 'bg-img-btn btn btn-outline-primary p-0';
  btn.style.width = '64px';
  btn.style.height = '64px';
  btn.style.backgroundImage = `url('${dataUrl}')`;
  btn.style.backgroundSize = 'cover';
  return btn;
}

// Converts an image src (data URL) to a binary NxN array (0/1), then calls cb(array)
function convertImageToBinaryArray(imgSrc, cb) {
  const N = 64;
  const canvas = document.createElement('canvas');
  canvas.width = N;
  canvas.height = N;
  const ctx = canvas.getContext('2d');
  const img = new window.Image();
  img.onload = function () {
    ctx.clearRect(0, 0, N, N);
    ctx.drawImage(img, 0, 0, N, N);
    const imgData = ctx.getImageData(0, 0, N, N);
    const arr = [];
    for (let y = 0; y < N; ++y) {
      const row = [];
      for (let x = 0; x < N; ++x) {
        const idx = (y * N + x) * 4;
        const r = imgData.data[idx];
        const g = imgData.data[idx + 1];
        const b = imgData.data[idx + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        row.push(gray > 127 ? 1 : 0);
      }
      arr.push(row);
    }
    cb(arr);
  };
  img.src = imgSrc;
}

function importBgImage(files) {
  for (const file of files) {
    if (!file) continue;
    if (bgImages.length >= bgImageNumber) break;
    if (/\.(jpe?g|png)$/i.test(file.name)) {
      const reader = new FileReader();
      reader.onload = ev => {
        if (bgImages.length < bgImageNumber) {
          convertImageToBinaryArray(ev.target.result, arr => {
            bgImages.push(arr);
            renderBgButtons();
          });
        }
      };
      reader.readAsDataURL(file);
    }
  }
}

// Patch move sync
const origRedraw = window.redraw;
window.redraw = function () {
  origRedraw();
  if (moveSyncEnabled && isHost) sendHostState();
};