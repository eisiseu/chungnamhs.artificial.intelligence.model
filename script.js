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

let models = {
    model1: null,
    model2: null,
    model3: null
};

let webcam = null;
let isWebcamActive = false;

// 메타데이터 로드
async function loadMetadata(path) {
    const response = await fetch(path);
    return await response.json();
}

// 모델 로드
async function loadModels() {
    try {
        document.getElementById('result').textContent = "모델을 불러오는 중입니다...";

        // 각 모델과 메타데이터 로드
        for (const [key, paths] of Object.entries(MODEL_PATHS)) {
            const metadata = await loadMetadata(paths.metadata);
            models[key] = await tmImage.load(paths.model, metadata);
        }

        console.log("모든 모델이 로드되었습니다.");
        document.getElementById('result').textContent = "입력 방식을 선택해주세요";
    } catch (error) {
        console.error("모델 로드 중 오류 발생:", error);
        document.getElementById('result').textContent = "모델 로드 중 오류가 발생했습니다. 페이지를 새로고침 해주세요.";
    }
}

// 웹캠 초기화
async function initWebcam() {
    try {
        const flip = true;
        webcam = new tmImage.Webcam(400, 300, flip);
        await webcam.setup();
        const webcanElement = document.getElementById('webcam');
        webcanElement.srcObject = webcam.webcam.srcObject;
    } catch (error) {
        console.error("웹캠 초기화 중 오류 발생:", error);
        document.getElementById('result').textContent = "웹캠을 시작할 수 없습니다.";
    }
}

// 예측 실행
async function predict(image) {
    try {
        if (!models.model1 || !models.model2 || !models.model3) {
            throw new Error("모델이 아직 로드되지 않았습니다.");
        }

        const results = {
            model1: await models.model1.predict(image),
            model2: await models.model2.predict(image),
            model3: await models.model3.predict(image)
        };

        // 각 모델의 예측 결과 분석
        const modelResults = {};
        let validResultCount = 0; // '이외'가 아닌 결과의 수를 카운트

        for (const [modelName, predictions] of Object.entries(results)) {
            // 가장 높은 확률을 가진 클래스와 그 확률 찾기
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

            // '이외'가 아닌 결과 카운트
            if (maxClass !== '이외') {
                validResultCount++;
            }
        }

        // 결과 처리
        const resultDiv = document.getElementById('result');
        const detailedResultDiv = document.getElementById('detailed-result');

        if (validResultCount === 1) {
            // 딱 하나의 모델만 '이외'가 아닌 결과를 출력한 경우
            for (const [modelName, result] of Object.entries(modelResults)) {
                if (result.className !== '이외') {
                    const modelRange = {
                        model1: "1~3",
                        model2: "4~6",
                        model3: "7~9"
                    };
                    resultDiv.textContent = `${modelRange[modelName]} 범위의 숫자입니다. (확률: ${(result.probability * 100).toFixed(1)}%)`;
                    detailedResultDiv.textContent = `예측된 숫자: ${result.className}`;
                    console.log(`단일 모델 예측 결과: ${modelName}이(가) ${result.className} 클래스를 ${(result.probability * 100).toFixed(1)}% 확률로 예측`);
                    return;
                }
            }
        } else if (validResultCount > 1) {
            // 여러 모델이 '이외'가 아닌 결과를 출력한 경우
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
                resultDiv.textContent = `${modelRange[bestModel]} 범위의 숫자입니다. (확률: ${(bestProb * 100).toFixed(1)}%)`;
                detailedResultDiv.textContent = `예측된 숫자: ${bestClass}`;
                console.log(`다중 모델 중 최고 예측 결과: ${bestModel}이(가) ${(bestProb * 100).toFixed(1)}% 확률로 예측`);
                return;
            }
        }

        // 모든 모델이 '이외'를 출력한 경우
        resultDiv.textContent = "숫자를 정확하게 인식할 수 없습니다. (모든 모델이 '이외' 예측)";
        detailedResultDiv.textContent = "";

        // 디버깅을 위한 상세 결과 출력
        console.log('모델별 예측 결과:', modelResults);
        console.log('유효한 예측 수:', validResultCount);
        
    } catch (error) {
        console.error("예측 중 오류 발생:", error);
        document.getElementById('result').textContent = "예측 중 오류가 발생했습니다.";
        document.getElementById('detailed-result').textContent = "";
    }
}

// 입력 방식 선택 처리
document.querySelectorAll('input[name="input-type"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        // 모든 컨테이너와 버튼 숨기기
        document.getElementById('webcam-container').classList.remove('active-container');
        document.getElementById('image-container').classList.remove('active-container');
        document.getElementById('webcam-button').classList.remove('active-button');
        document.getElementById('upload-button').classList.remove('active-button');

        // 웹캠이 활성화되어 있다면 중지
        if (isWebcamActive) {
            webcam.stop();
            isWebcamActive = false;
            document.getElementById('webcam-button').textContent = "카메라 시작";
        }

        // 선택된 입력 방식에 따라 UI 표시
        if (e.target.value === 'camera') {
            document.getElementById('webcam-container').classList.add('active-container');
            document.getElementById('webcam-button').classList.add('active-button');
        } else if (e.target.value === 'image') {
            document.getElementById('image-container').classList.add('active-container');
            document.getElementById('upload-button').classList.add('active-button');
        }

        document.getElementById('result').textContent = "준비되었습니다";
        document.getElementById('detailed-result').textContent = "";
    });
});

// 웹캠 시작/중지
document.getElementById('webcam-button').addEventListener('click', async () => {
    if (!isWebcamActive) {
        try {
            if (!webcam) {
                await initWebcam();
            }
            await webcam.play();
            isWebcamActive = true;
            document.getElementById('webcam-button').textContent = "카메라 중지";
            
            // 실시간 예측
            async function loop() {
                if (isWebcamActive) {
                    await predict(webcam.canvas);
                    window.requestAnimationFrame(loop);
                }
            }
            loop();
        } catch (error) {
            console.error("카메라 시작 중 오류 발생:", error);
            document.getElementById('result').textContent = "카메라를 시작할 수 없습니다.";
        }
    } else {
        webcam.stop();
        isWebcamActive = false;
        document.getElementById('webcam-button').textContent = "카메라 시작";
        document.getElementById('result').textContent = "카메라가 중지되었습니다";
    }
});

// 이미지 업로드
document.getElementById('upload-button').addEventListener('click', () => {
    document.getElementById('file-upload').click();
});

document.getElementById('file-upload').addEventListener('change', async (e) => {
    if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = async function(e) {
            const img = document.getElementById('uploaded-image');
            img.src = e.target.result;

            // 이미지가 로드되면 예측 실행
            img.onload = async () => {
                await predict(img);
            };
        };
        reader.readAsDataURL(e.target.files[0]);
    }
});

// 페이지 로드 시 모델 로드
loadModels(); 