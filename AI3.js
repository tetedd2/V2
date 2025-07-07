// AI1.js - เวอร์ชันรวมปุ่มสาเหตุ/รักษา + ระบบกล้อง + ระบบจำแนก
const URL = "https://teachablemachine.withgoogle.com/models/2W4npTTEM/";
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
const confirmButton = document.getElementById('confirmButton'); // ปุ่มยืนยัน

let selectedImage = null; // ใช้เก็บรูปภาพที่ผู้ใช้เลือก
let predictionHistory = [];
const REQUIRED_CONSISTENCY_TIME_MS = 2000;
const REQUIRED_PROBABILITY = 0.9;

// ฟังก์ชันแสดงข้อความ
function showMessage(text, type = '') {
    messageElement.textContent = text;
    messageElement.className = `message ${type}`.trim();
}

function stopCamera() {
    isPredicting = false;
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    if (videoElement) {
        videoElement.srcObject = null;
    }
    const webcamDiv = document.getElementById("webcam");
    if (webcamDiv) {
        webcamDiv.innerHTML = '<p>กล้องหยุดทำงานแล้ว</p>';
    }
    showMessage('กล้องและโมเดลหยุดทำงานแล้ว');
    if (labelContainer) labelContainer.innerHTML = '';
    startButton.disabled = false;
    stopButton.disabled = true;
    switchCameraButton.disabled = true;
    predictionHistory = [];
}


// ฟังก์ชันแสดงข้อผิดพลาด
function showError(text) {
    showMessage(text, 'error');
    startButton.disabled = false;
    stopButton.disabled = true;
    switchCameraButton.disabled = true;
}

async function setupCamera() {
    const constraints = {
        audio: false,
        video: {
            facingMode: currentFacingMode
        }
    };
    videoElement = document.createElement('video');
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoElement.srcObject = stream;
    await videoElement.play();

    const webcamDiv = document.getElementById("webcam");
    webcamDiv.innerHTML = '';
    webcamDiv.appendChild(videoElement);
}


async function init() {
    showMessage('กำลังโหลดโมเดล...');
    startButton.disabled = true;
    stopButton.disabled = true;
    switchCameraButton.disabled = true;

    try {
        model = await tmImage.load(`${URL}model.json`, `${URL}metadata.json`);
        maxPredictions = model.getTotalClasses();
        showMessage('โมเดลพร้อมใช้งาน!', 'success');
    } catch (error) {
        showError(`เกิดข้อผิดพลาดในการโหลดโมเดล: ${error.message}`);
        return;
    }

    await setupCamera();
    stopButton.disabled = false;
    switchCameraButton.disabled = false;
}

// ฟังก์ชันเริ่มต้นการจำแนกเมื่อกดปุ่มยืนยัน
async function startClassification() {
    if (!selectedImage) {
        showError("กรุณาเลือกรูปภาพก่อน");
        return;
    }

    showMessage("กำลังวิเคราะห์ภาพ...");
    resultDisplayElement.innerHTML = "";

    try {
        if (!model) {
            showMessage("กำลังโหลดโมเดล...");
            model = await tmImage.load(`${URL}model.json`, `${URL}metadata.json`);
            maxPredictions = model.getTotalClasses();
            showMessage("โมเดลพร้อมใช้งาน!", "success");
        }

        const prediction = await model.predict(selectedImage);
        prediction.sort((a, b) => b.probability - a.probability);
        const top = prediction[0];
        handleFinalResult(top.className);
    } catch (err) {
        showError("เกิดข้อผิดพลาดในการวิเคราะห์ภาพ: " + err.message);
    }
}

// ฟังก์ชันซ่อนและแสดงปุ่ม
function toggleVisibility(buttonId, shouldShow) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.style.display = shouldShow ? 'block' : 'none';
    }
}

// ฟังก์ชันเริ่มต้นการจำแนกเมื่อกดปุ่มยืนยัน
async function startClassification() {
    if (!selectedImage) {
        showError("กรุณาเลือกรูปภาพก่อน");
        return;
    }

    showMessage("กำลังวิเคราะห์ภาพ...");
    resultDisplayElement.innerHTML = "";

    try {
        if (!model) {
            showMessage("กำลังโหลดโมเดล...");
            model = await tmImage.load(`${URL}model.json`, `${URL}metadata.json`);
            maxPredictions = model.getTotalClasses();
            showMessage("โมเดลพร้อมใช้งาน!", "success");
        }

        const prediction = await model.predict(selectedImage);
        prediction.sort((a, b) => b.probability - a.probability);
        const top = prediction[0];
        handleFinalResult(top.className);
    } catch (err) {
        showError("เกิดข้อผิดพลาดในการวิเคราะห์ภาพ: " + err.message);
    }

    // ซ่อนปุ่มเลือกภาพและถ่ายภาพเมื่อเริ่มการจำแนก
    toggleVisibility("selectImage", false);
    toggleVisibility("captureImage", false);
    toggleVisibility("startButton", false);
    toggleVisibility("confirmButton", false);
    }

function handleFinalResult(className) {
    let resultText = {
        'A1': '✅ ปลอดเชื้อโรค ✅',
        'A2': '🚨 ใบไหม้ 🚨',
        'A3': '🚨 เพลี้ยไฟ 🚨',
        'A4': '🚨 ใบจุดขาว 🚨',
        'A5': '🚨 กรุณาถ่ายใหม่ 🚨',
        
    }[className] || `💡 ตรวจพบ: ${className}`;

    resultDisplayElement.innerHTML = `<h3>${resultText}</h3>`;
    resultDisplayElement.className = 'important-message';

    // ✅ ใช้ toggleInfoButtons หรือปรับ style ตรง ๆ ก็ได้
    const shouldShowInfoButtons = ['A2', 'A3', 'A4'].includes(className);
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

async function startClassification() {
    if (!selectedImage || !selectedImage.complete) {
        showError("กรุณาเลือกรูปภาพก่อน และรอให้โหลดจนเสร็จ");
        return;
    }

    showMessage("กำลังวิเคราะห์ภาพ...");
    resultDisplayElement.innerHTML = "";

    try {
        if (!model) {
            showMessage("กำลังโหลดโมเดล...");
            model = await tmImage.load(`${URL}model.json`, `${URL}metadata.json`);
            maxPredictions = model.getTotalClasses();
            showMessage("โมเดลพร้อมใช้งาน!", "success");
        }

        const prediction = await model.predict(selectedImage);
        prediction.sort((a, b) => b.probability - a.probability);
        const top = prediction[0];
        handleFinalResult(top.className);
    } catch (err) {
        showError("เกิดข้อผิดพลาดในการวิเคราะห์ภาพ: " + err.message);
    }
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

function toggleButtons(className) {
    console.log("Handling buttons for class:", className); // เพิ่ม log เพื่อตรวจสอบ
    const actionButtons = document.querySelectorAll('#actionButtons button');
    const infoButtons = document.querySelectorAll('#infoButtons button');
    // รายชื่อโรคที่จะแสดงปุ่ม
   const showButtonsFor = ["A2", "A3", "A4"];

    if (showButtonsFor.includes(label)) {
        // ตั้งชื่อโรคให้ตรงตาม label
        let name = "";
        switch (label) {
            case "A2":
                name = "โรคใบไหม้";
                break;
            case "A3":
                name = "โรคเพลี้ยไฟ";
                break;
            case "A4":
                name = "โรคราขาว";
                break;
           
        }

        resultMessage.textContent = `🚨 เป็น${name} (${label}) 🚨`;
        infoContainer.classList.remove("hidden");
    } else {
        infoContainer.classList.add("hidden");
    }

    // หากต้องการแสดงผล label ตรงอื่น:
    const labelContainer = document.getElementById("label-container");
    if (labelContainer) {
        labelContainer.textContent = "Label: " + label;
    }
}
window.addEventListener('DOMContentLoaded', () => {
    toggleInfoButtons(false);
    stopButton.disabled = true;
    switchCameraButton.disabled = true;
});

window.addEventListener('beforeunload', stopCamera);

// วิเคราะห์ภาพจากไฟล์ที่อัปโหลด
function handleImageUpload(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        const image = new Image();
        image.onload = () => {
            const webcamDiv = document.getElementById("webcam");
            webcamDiv.innerHTML = ''; // ล้างภาพเก่าออก
            webcamDiv.appendChild(image); // แสดงภาพใหม่

            selectedImage = image; // กำหนดภาพที่เลือกไว้เพื่อ predict
            confirmButton.disabled = false; // เปิดปุ่มยืนยัน
            showMessage('พร้อมจำแนก กด "ยืนยัน" เพื่อเริ่ม', 'info');
        };
        image.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// เมื่อโหลดหน้าเว็บ
window.addEventListener('DOMContentLoaded', () => {
    toggleInfoButtons(false);
    stopButton.disabled = true;
    switchCameraButton.disabled = true;
});

window.addEventListener('beforeunload', stopCamera);

function toggleVisibility(buttonId, shouldShow) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.style.display = shouldShow ? 'block' : 'none';
    }
}

// ฟังก์ชันเริ่มต้นการจำแนกเมื่อกดปุ่มยืนยัน
async function startClassification() {
    if (!selectedImage) {
        showError("กรุณาเลือกรูปภาพก่อน");
        return;
    }

    showMessage("กำลังวิเคราะห์ภาพ...");
    resultDisplayElement.innerHTML = "";

    try {
        if (!model) {
            showMessage("กำลังโหลดโมเดล...");
            model = await tmImage.load(`${URL}model.json`, `${URL}metadata.json`);
            maxPredictions = model.getTotalClasses();
            showMessage("โมเดลพร้อมใช้งาน!", "success");
        }

        const prediction = await model.predict(selectedImage);
        prediction.sort((a, b) => b.probability - a.probability);
        const top = prediction[0];
        handleFinalResult(top.className);
        
    } catch (err) {
        showError("เกิดข้อผิดพลาดในการวิเคราะห์ภาพ: " + err.message);
    }

    // ซ่อนปุ่มเลือกภาพและถ่ายภาพเมื่อเริ่มการจำแนก
    toggleVisibility("selectImage", false);
    toggleVisibility("captureImage", false);
    toggleVisibility("startButton", true);
    toggleVisibility("confirmButton", false);

    // แสดงปุ่ม actionButtons หลังจากจำแนกเสร็จ
    toggleVisibility("actionButtons", true);
}

// ฟังก์ชันเมื่อกดปุ่มยืนยัน
confirmButton.addEventListener('click', startClassification);

// 📁 กดเลือกจากอัลบั้ม
document.getElementById("selectImage").addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) handleImageUpload(file);
    event.target.value = "";
});

document.getElementById("captureImage").addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) handleImageUpload(file);
    event.target.value = "";
});

function handleImageUpload(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        const image = new Image();
        image.onload = () => {
            const webcamDiv = document.getElementById("webcam");
            webcamDiv.innerHTML = '';
            webcamDiv.appendChild(image);
            selectedImage = image;
            confirmButton.disabled = false;
            showMessage('พร้อมจำแนก กด "ยืนยัน" เพื่อเริ่ม', 'info');
            // ======= ซ่อนปุ่มหลังเลือกรูป =======
            toggleVisibility("selectImage", false);
            toggleVisibility("captureImage", false);
            toggleVisibility("confirmButton", true);
        };
        image.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

confirmButton.addEventListener('click', startClassification);

// กรณีที่ต้องการปุ่มยืนยันแยกต่างหาก
function toggleInfoButtons(show) {
    infoButtonsDiv.classList.toggle('hidden', !show);
    actionButtonsDiv.classList.toggle('hidden', show);
}
