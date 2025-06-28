// AI1.js - เวอร์ชันรวมปุ่มสาเหตุ/รักษา + ระบบกล้อง + ระบบจำแนก
const URL = "https://teachablemachine.withgoogle.com/models/l_zvMSkA3/";
let model, labelContainer, maxPredictions;
let isPredicting = false;
let currentFacingMode = 'environment';
let videoElement, stream;

const messageElement = document.getElementById('message');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const switchCameraButton = document.getElementById('switchCameraButton');
const resultDisplayElement = document.getElementById('resultDisplay');
const actionButtonsDiv = document.getElementById('actionButtons');
const infoButtonsDiv = document.getElementById('infoButtons');
const causeButton = document.getElementById('causeButton');
const treatmentButton = document.getElementById('treatmentButton');

let predictionHistory = [];
const REQUIRED_CONSISTENCY_TIME_MS = 2000;
const REQUIRED_PROBABILITY = 0.9;

function toggleInfoButtons(show) {
    infoButtonsDiv.classList.toggle('hidden', !show);
    actionButtonsDiv.classList.toggle('hidden', show);
}

function showMessage(text, type = '') {
    messageElement.textContent = text;
    messageElement.className = `message ${type}`.trim();
}

function showError(text) {
    showMessage(text, 'error');
    startButton.disabled = false;
    stopButton.disabled = true;
    switchCameraButton.disabled = true;
}

async function init() {
    showMessage('กำลังโหลดโมเดลและตั้งค่ากล้อง...');
    startButton.disabled = true;
    stopButton.disabled = true;
    switchCameraButton.disabled = true;
    toggleInfoButtons(false);
    resultDisplayElement.innerHTML = '';
    predictionHistory = [];

    async function predict() {
    if (!videoElement || videoElement.readyState < 2) return;
    const prediction = await model.predict(videoElement);
    prediction.sort((a, b) => b.probability - a.probability);
    const top = prediction[0];
    const currentTime = Date.now();
    if (top.probability > 0.7) {
        predictionHistory.push({ className: top.className, probability: top.probability, time: currentTime });
    } else {
        predictionHistory = [];
    }
    predictionHistory = predictionHistory.filter(p => currentTime - p.time <= REQUIRED_CONSISTENCY_TIME_MS);

    const consistent = predictionHistory.length > 0 &&
        predictionHistory.every(p => p.className === top.className && p.probability >= REQUIRED_PROBABILITY) &&
        (predictionHistory[predictionHistory.length - 1].time - predictionHistory[0].time >= REQUIRED_CONSISTENCY_TIME_MS);

    if (consistent) {
        handleFinalResult(top.className); // ส่ง className ไปยัง handleFinalResult
    } else {
        showResultHint(top);
    }
}

    try {
        model = await tmImage.load(`${URL}model.json`, `${URL}metadata.json`);
        maxPredictions = model.getTotalClasses();
    } catch (error) {
        showError(`เกิดข้อผิดพลาดในการโหลดโมเดล: ${error.message}`);
        return;
    }

    await setupCamera();

    labelContainer = document.getElementById("label-container");
    labelContainer.innerHTML = '';
    for (let i = 0; i < maxPredictions; i++) {
        labelContainer.appendChild(document.createElement("div"));
    }

    showMessage('พร้อมสำหรับการจำแนก!', 'success');
    stopButton.disabled = false;
    switchCameraButton.disabled = false;
}

async function setupCamera() {
    if (stream) stream.getTracks().forEach(track => track.stop());

    const constraints = {
        video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: currentFacingMode }
    };

    try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);

        videoElement = document.createElement('video');
        videoElement.setAttribute('playsinline', true);
        videoElement.muted = true;
        videoElement.autoplay = true;
        videoElement.srcObject = stream;

        const webcamDiv = document.getElementById("webcam");
        webcamDiv.innerHTML = '';
        webcamDiv.appendChild(videoElement);

        await new Promise((resolve) => {
            videoElement.onloadedmetadata = () => resolve(videoElement.play());
            setTimeout(resolve, 3000);
        });

        isPredicting = true;
        window.requestAnimationFrame(loop);
    } catch (error) {
        let msg = error.name === 'NotAllowedError' ? 'ไม่ได้รับอนุญาตให้เข้าถึงกล้อง' :
                  error.name === 'NotFoundError' ? 'ไม่พบกล้องในอุปกรณ์' :
                  'เกิดข้อผิดพลาดในการเปิดกล้อง';
        showError(msg);
    }
}

async function loop() {
    if (!isPredicting) return;
    await predict();
    window.requestAnimationFrame(loop);
}

async function predict() {
    if (!videoElement || videoElement.readyState < 2) return;

    const prediction = await model.predict(videoElement);
    prediction.sort((a, b) => b.probability - a.probability);

    const top = prediction[0];
    const currentTime = Date.now();

    if (top.probability > 0.7) {
        predictionHistory.push({ className: top.className, probability: top.probability, time: currentTime });
    } else {
        predictionHistory = [];
    }

    predictionHistory = predictionHistory.filter(p => currentTime - p.time <= REQUIRED_CONSISTENCY_TIME_MS);

    const consistent = predictionHistory.length > 0 &&
        predictionHistory.every(p => p.className === top.className && p.probability >= REQUIRED_PROBABILITY) &&
        (predictionHistory[predictionHistory.length - 1].time - predictionHistory[0].time >= REQUIRED_CONSISTENCY_TIME_MS);

    if (consistent) {
        handleFinalResult(top.className);
    } else {
        showResultHint(top);
    }
}

function handleFinalResult(className) {
    let resultText = {
        'D1': '✅ ปลอดเชื้อโรค ✅',
        'D2': '🚨 เป็นโรคจุดราขาว 🚨',
        'D3': '🚨 เป็นโรคสนิม 🚨',
        'D4': '🚨 เป็นโรคใบไหม้ 🚨',
        'D5': '🚨 กรุณาถ่ายใหม่ 🚨',
        'D6': '🚨 เอ๊ะ ยังไม่สุกน่ะ 🚨',
        'D7': '🕐 รอต่อสัก 2-3 วัน 🕐',
        'D8': '✅ พร้อมทานรสชาติหวาน ✅'

        
    }[className] || `💡 ตรวจพบ: ${className}`;

    resultDisplayElement.innerHTML = `<h3>${resultText}</h3>`;
    resultDisplayElement.className = 'important-message';

    // ✅ ใช้ toggleInfoButtons หรือปรับ style ตรง ๆ ก็ได้
    const shouldShowInfoButtons = ['V1', 'V2', 'V7', 'V8'].includes(className);
    document.getElementById("actionButtons").style.display = shouldShowInfoButtons ? 'none' : 'block';
    document.getElementById("infoButtons").style.display = shouldShowInfoButtons ? 'flex' : 'none';

    stopCamera();
}
 
// ย้ายปุ่ม "สาเหตุ" และ "วิธีรักษา" เข้าสู่ #resultDisplay
function moveInfoButtonsToResultDisplay() {
    const causeButton = document.getElementById('causeButton');
    const treatmentButton = document.getElementById('treatmentButton');
    const resultDisplay = document.getElementById('resultDisplay');

    // ย้ายปุ่ม "สาเหตุ" และ "วิธีรักษา" เข้าสู่ #resultDisplay
    resultDisplay.appendChild(causeButton);
    resultDisplay.appendChild(treatmentButton);

    // ลบ div #infoButtons ออกเพื่อไม่ให้มีปุ่มซ้ำ
    const infoButtonsDiv = document.getElementById('infoButtons');
    infoButtonsDiv.remove();
}

function showResultHint(top) {
    const timeElapsed = predictionHistory.length > 0
        ? predictionHistory[predictionHistory.length - 1].time - predictionHistory[0].time
        : 0;
    const remaining = Math.max(0, Math.ceil((REQUIRED_CONSISTENCY_TIME_MS - timeElapsed) / 1000));
    resultDisplayElement.innerHTML = `กำลังรอการยืนยัน "${top.className}" (${(top.probability * 100).toFixed(1)}%)<br>ต้องมั่นใจต่อเนื่องอีกประมาณ ${remaining} วินาที`;
    resultDisplayElement.className = 'info-message';
}

async function stopCamera() {
    isPredicting = false;
    if (stream) stream.getTracks().forEach(track => track.stop());
    if (videoElement) videoElement.srcObject = null;
    document.getElementById("webcam").innerHTML = '<p>กล้องหยุดทำงานแล้ว</p>';
    showMessage('กล้องและโมเดลหยุดทำงานแล้ว');
    labelContainer.innerHTML = '';
    startButton.disabled = false;
    stopButton.disabled = true;
    switchCameraButton.disabled = true;
    predictionHistory = [];
}

async function switchCamera() {
    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    await stopCamera();
    await setupCamera();
    showMessage('พร้อมสำหรับการจำแนก!', 'success');
    stopButton.disabled = false;
    switchCameraButton.disabled = false;
}

startButton.addEventListener('click', init);
stopButton.addEventListener('click', stopCamera);
switchCameraButton.addEventListener('click', switchCamera);

// function toggleButtons(className) {
//     console.log("Handling buttons for class:", className); // เพิ่ม log เพื่อตรวจสอบ
//     const actionButtons = document.querySelectorAll('#actionButtons button');
//     const infoButtons = document.querySelectorAll('#infoButtons button');
// }

async function stopCamera() {
    isPredicting = false;
    if (stream) stream.getTracks().forEach(track => track.stop());
    if (videoElement) videoElement.srcObject = null;
    document.getElementById("webcam").innerHTML = '<p>กล้องหยุดทำงานแล้ว</p>';
    showMessage('กล้องและโมเดลหยุดทำงานแล้ว');
    labelContainer.innerHTML = '';
    startButton.disabled = false;
    stopButton.disabled = true;
    switchCameraButton.disabled = true;
    predictionHistory = [];
}

async function switchCamera() {
    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    await stopCamera();
    await setupCamera();
    showMessage('พร้อมสำหรับการจำแนก!', 'success');
    stopButton.disabled = false;
    switchCameraButton.disabled = false;
}

startButton.addEventListener('click', init);
stopButton.addEventListener('click', stopCamera);
switchCameraButton.addEventListener('click', switchCamera);

// ฟังก์ชันแสดงรูปภาพ PNG
function showImage(imageUrl) {
    const existingModal = document.getElementById('imageModal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'imageModal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '9999';

    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = 'Disease Info';
    img.style.maxWidth = '90%';
    img.style.maxHeight = '80vh';
    img.style.objectFit = 'contain';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '❌';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '20px';
    closeBtn.style.right = '20px';
    closeBtn.style.fontSize = '24px';
    closeBtn.style.color = '#fff';
    closeBtn.style.background = 'transparent';
    closeBtn.style.border = 'none';
    closeBtn.style.cursor = 'pointer';

    closeBtn.addEventListener('click', () => modal.remove());

    modal.appendChild(img);
    modal.appendChild(closeBtn);
    document.body.appendChild(modal);
}

// ปุ่ม "สาเหตุ"
causeButton.addEventListener('click', () => {
    const resultText = resultDisplayElement.querySelector('h3')?.textContent.trim() || '';
    let imageUrl = '';

    if (resultText.includes('จุดราขาว')) {
        imageUrl = '14.png';
    } else if (resultText.includes('สนิม')) {
        imageUrl = '16.png';
    } else if (resultText.includes('ใบไหม้')) {
        imageUrl = '12.png';
    } else if (resultText.includes('ราขาว')) {
        imageUrl = '201.png';
    }

    if (imageUrl) showImage(imageUrl);
});

// ปุ่ม "วิธีรักษา"
treatmentButton.addEventListener('click', () => {
    const resultText = resultDisplayElement.querySelector('h3')?.textContent.trim() || '';
    let imageUrl = '';

    if (resultText.includes('จุดราขาว')) {
        imageUrl = '15.png';
    } else if (resultText.includes('สนิม')) {
        imageUrl = 'health3.png';
    } else if (resultText.includes('ใบไหม้')) {
        imageUrl = 'health4.png';
    } else if (resultText.includes('ราขาว')) {
        imageUrl = 'health11.png';
    }

    if (imageUrl) showImage(imageUrl);
});


// เมื่อโหลดหน้าเว็บ
window.addEventListener('DOMContentLoaded', () => {
    toggleInfoButtons(false);
    stopButton.disabled = true;
    switchCameraButton.disabled = true;
    window.addEventListener('beforeunload', stopCamera);
});
