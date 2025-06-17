// 모델 경로 설정
const MODEL_PATHS = {
    model1: {
        model: "./3`1/model.json",
        metadata: "./3`1/metadata.json"
    },
    model2: {
        model: "./6`4/model.json",
        metadata: "./6`4/metadata.json"
    },
    model3: {
        model: "./9`7/model.json",
        metadata: "./9`7/metadata.json"
    }
};

// 상태 관리
let state = {
    models: {
        model1: null,
        model2: null,
        model3: null
    },
    webcam: null,
    isWebcamActive: false,
    lastPredictionTime: 0,
    predictionInterval: 10,
    currentMode: 'camera' // 'camera' 또는 'image'
};

// DOM 요소
const elements = {
    webcamContainer: document.getElementById('webcam-container'),
    imageContainer: document.getElementById('image-container'),
    uploadedImage: document.getElementById('uploaded-image'),
    result: document.getElementById('result'),
    webcamButton: document.getElementById('webcam-button'),
    webcamVideo: document.getElementById('webcam'),
    fileUpload: document.getElementById('file-upload'),
    uploadButton: document.getElementById('upload-button')
};

// 메타데이터 로드
async function loadMetadata(path) {
    const response = await fetch(path);
    return await response.json();
}

// 모델 로드
async function loadModels() {
    try {
        elements.result.textContent = "모델을 불러오는 중입니다...";

        // 각 모델과 메타데이터 로드
        for (const [key, paths] of Object.entries(MODEL_PATHS)) {
            const metadata = await loadMetadata(paths.metadata);
            state.models[key] = await tmImage.load(paths.model, metadata);
        }

        console.log("모든 모델이 로드되었습니다.");
        elements.result.textContent = "카메라를 시작합니다...";
        // 모델 로드 후 자동으로 웹캠 시작
        await startWebcam();
    } catch (error) {
        console.error("모델 로드 중 오류 발생:", error);
        elements.result.textContent = "모델 로드 중 오류가 발생했습니다. 페이지를 새로고침 해주세요.";
    }
}

// 웹캠 초기화
async function initWebcam() {
    try {
        const flip = true;
        state.webcam = new tmImage.Webcam(400, 300, flip);
        await state.webcam.setup();
        elements.webcamVideo.srcObject = state.webcam.webcam.srcObject;
        await new Promise((resolve) => {
            elements.webcamVideo.onloadeddata = () => resolve();
        });
    } catch (error) {
        console.error("웹캠 초기화 중 오류 발생:", error);
        elements.result.textContent = "웹캠을 시작할 수 없습니다.";
        throw error;
    }
}

// 예측 실행
async function predict(image) {
    try {
        if (!state.models.model1 || !state.models.model2 || !state.models.model3) {
            throw new Error("모델이 아직 로드되지 않았습니다.");
        }

        const currentTime = Date.now();
        if (currentTime - state.lastPredictionTime < state.predictionInterval) {
            return;
        }
        state.lastPredictionTime = currentTime;

        const results = {
            model1: await state.models.model1.predict(image),
            model2: await state.models.model2.predict(image),
            model3: await state.models.model3.predict(image)
        };

        // 각 모델의 예측 결과 분석
        const modelResults = {};
        let validResultCount = 0;

        for (const [modelName, predictions] of Object.entries(results)) {
            let maxProb = 0;
            let maxClass = '';
            predictions.forEach((p) => {
                if (p.probability > maxProb) {
                    maxProb = p.probability;
                    maxClass = p.className;
                }
            });
            modelResults[modelName] = {
                className: maxClass,
                probability: maxProb
            };

            if (maxClass !== '이외') {
                validResultCount++;
            }
        }

        if (validResultCount === 1) {
            for (const [modelName, result] of Object.entries(modelResults)) {
                if (result.className !== '이외') {
                    const modelRange = {
                        model1: "1~3",
                        model2: "4~6",
                        model3: "7~9"
                    };
                    elements.result.textContent = `감지된 숫자: ${result.className} (${modelRange[modelName]} 범위, ${(result.probability * 100).toFixed(1)}%)`;
                    console.log(`${result.className} ${modelRange[modelName]} ${(result.probability * 100).toFixed(1)}`);
                    return;
                }
            }
        } else if (validResultCount > 1) {
            let bestModel = null;
            let bestProb = 0;
            let bestClass = '';

            for (const [modelName, result] of Object.entries(modelResults)) {
                if (result.className !== '이외' && result.probability > bestProb) {
                    bestProb = result.probability;
                    bestModel = modelName;
                    bestClass = result.className;
                }
            }

            if (bestModel) {
                const modelRange = {
                    model1: "1~3",
                    model2: "4~6",
                    model3: "7~9"
                };
                elements.result.textContent = `감지된 숫자: ${bestClass} (${modelRange[bestModel]} 범위, ${(bestProb * 100).toFixed(1)}%)`;
                return;
            }
        }

        elements.result.textContent = "숫자를 찾는 중...";
    } catch (error) {
        console.error("예측 중 오류 발생:", error);
        elements.result.textContent = "예측 중 오류가 발생했습니다.";
    }
}

// 웹캠 시작
async function startWebcam() {
    try {
        if (!state.webcam) {
            await initWebcam();
        }
        await state.webcam.play();
        state.isWebcamActive = true;
        state.currentMode = 'camera';
        
        updateUIForWebcam();
        
        // 실시간 예측
        async function loop() {
            if (state.isWebcamActive) {
                await predict(state.webcam.canvas);
                window.requestAnimationFrame(loop);
            }
        }
        loop();
    } catch (error) {
        console.error("카메라 시작 중 오류 발생:", error);
        elements.result.textContent = "카메라를 시작할 수 없습니다.";
    }
}

// 웹캠 중지
function stopWebcam() {
    if (state.isWebcamActive && state.webcam) {
        state.webcam.stop();
        state.isWebcamActive = false;
        elements.webcamButton.textContent = '카메라 시작';
        elements.result.textContent = "카메라가 중지되었습니다";
    }
}

// UI 업데이트 함수
function updateUIForWebcam() {
    elements.webcamContainer.style.display = 'block';
    elements.imageContainer.style.display = 'none';
    elements.webcamButton.textContent = '카메라 중지';
}

function updateUIForImage() {
    elements.webcamContainer.style.display = 'none';
    elements.imageContainer.style.display = 'block';
    elements.webcamButton.textContent = '카메라 시작';
}

// 이미지 모드로 전환
function switchToImageMode() {
    stopWebcam();
    state.currentMode = 'image';
    updateUIForImage();
}

// 웹캠 모드로 전환
async function switchToWebcamMode() {
    try {
        elements.uploadedImage.src = '';
        state.currentMode = 'camera';
        await startWebcam();
    } catch (error) {
        console.error("웹캠 모드 전환 중 오류 발생:", error);
        elements.result.textContent = "카메라 전환 중 오류가 발생했습니다.";
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 웹캠 버튼 이벤트
    elements.webcamButton.addEventListener('click', async () => {
        if (state.currentMode === 'image') {
            await switchToWebcamMode();
        } else if (state.isWebcamActive) {
            stopWebcam();
        } else {
            await startWebcam();
        }
    });

    // 이미지 업로드 버튼 이벤트
    elements.uploadButton.addEventListener('click', () => {
        elements.fileUpload.click();
    });

    // 파일 업로드 처리
    elements.fileUpload.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
            switchToImageMode();
            elements.result.textContent = "이미지를 분석하는 중...";

            const reader = new FileReader();
            reader.onload = async function(e) {
                elements.uploadedImage.src = e.target.result;
                elements.uploadedImage.onload = async () => {
                    await predict(elements.uploadedImage);
                };
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    });
}

// 초기화 및 시작
async function initialize() {
    setupEventListeners();
    await loadModels();
}

// 페이지 로드 시 초기화
initialize(); 