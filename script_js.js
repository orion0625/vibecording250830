// 英単語データベース（初期データ）
let wordDatabase = [
    {english: "apple", japanese: "りんご"},
    {english: "book", japanese: "本"},
    {english: "cat", japanese: "猫"},
    {english: "dog", japanese: "犬"},
    {english: "house", japanese: "家"},
    {english: "water", japanese: "水"},
    {english: "school", japanese: "学校"},
    {english: "friend", japanese: "友達"},
    {english: "mother", japanese: "母"},
    {english: "father", japanese: "父"},
    {english: "happy", japanese: "幸せな"},
    {english: "beautiful", japanese: "美しい"},
    {english: "strong", japanese: "強い"},
    {english: "big", japanese: "大きい"},
    {english: "small", japanese: "小さい"},
    {english: "run", japanese: "走る"},
    {english: "walk", japanese: "歩く"},
    {english: "eat", japanese: "食べる"},
    {english: "drink", japanese: "飲む"},
    {english: "sleep", japanese: "眠る"}
];

let currentQuestionIndex = 0;
let correctAnswers = 0;
let usedQuestions = new Set();
let currentCorrectAnswer = '';
let quizQuestions = [];

// 効果音を生成する関数
function playSound(type) {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        if (type === 'correct') {
            // 正解音（明るい上昇音）
            const freq1 = 523.25; // C5
            const freq2 = 659.25; // E5
            const freq3 = 783.99; // G5
            
            [freq1, freq2, freq3].forEach((freq, index) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01 + index * 0.1);
                gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2 + index * 0.1);
                
                oscillator.start(audioContext.currentTime + index * 0.1);
                oscillator.stop(audioContext.currentTime + 0.2 + index * 0.1);
            });
        } else if (type === 'incorrect') {
            // 不正解音（低い下降音）
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
            oscillator.frequency.linearRampToValueAtTime(100, audioContext.currentTime + 0.5);
            oscillator.type = 'triangle';
            
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.5);
        } else if (type === 'complete') {
            // 完了音（勝利のファンファーレ風）
            const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
            
            notes.forEach((freq, index) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
                oscillator.type = 'square';
                
                gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01 + index * 0.2);
                gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3 + index * 0.2);
                
                oscillator.start(audioContext.currentTime + index * 0.2);
                oscillator.stop(audioContext.currentTime + 0.3 + index * 0.2);
            });
        }
    } catch (error) {
        console.log('Audio playback not supported or failed:', error);
    }
}

// Excelファイルをインポート
async function importExcel() {
    const fileInput = document.getElementById('excelFile');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('ファイルを選択してください。');
        return;
    }

    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, {type: 'array'});
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1});

        let importedCount = 0;
        let skippedCount = 0;

        // データを処理（ヘッダー行をスキップ）
        for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row.length >= 2 && row[0] && row[1]) {
                const english = String(row[0]).trim();
                const japanese = String(row[1]).trim();
                
                if (english && japanese) {
                    // 重複チェック
                    const exists = wordDatabase.some(word => 
                        word.english.toLowerCase() === english.toLowerCase() || 
                        word.japanese === japanese
                    );
                    
                    if (!exists) {
                        wordDatabase.push({english, japanese});
                        importedCount++;
                    } else {
                        skippedCount++;
                    }
                }
            }
        }

        // 結果を表示
        if (importedCount > 0) {
            alert(`${importedCount}個の単語をインポートしました。${skippedCount > 0 ? `${skippedCount}個の重複単語をスキップしました。` : ''}`);
            updateWordBank();
            updateStartButton();
            fileInput.value = ''; // ファイル選択をクリア
        } else {
            alert('インポートできる単語が見つかりませんでした。A列に英単語、B列に和訳が入力されているか確認してください。');
        }
    } catch (error) {
        console.error('インポートエラー:', error);
        alert('ファイルの読み込みに失敗しました。Excelファイル（.xlsx, .xls）であることを確認してください。');
    }
}

// 全ての単語を削除
function clearAllWords() {
    if (confirm('登録されている全ての単語を削除しますか？')) {
        wordDatabase = [];
        updateWordBank();
        updateStartButton();
    }
}

// 単語を追加する関数
function addWord() {
    const englishInput = document.getElementById('englishInput');
    const japaneseInput = document.getElementById('japaneseInput');
    
    const english = englishInput.value.trim();
    const japanese = japaneseInput.value.trim();
    
    if (english && japanese) {
        // 重複チェック
        const exists = wordDatabase.some(word => 
            word.english.toLowerCase() === english.toLowerCase() || 
            word.japanese === japanese
        );
        
        if (!exists) {
            wordDatabase.push({english, japanese});
            updateWordBank();
            englishInput.value = '';
            japaneseInput.value = '';
            updateStartButton();
        } else {
            alert('この単語は既に登録されています。');
        }
    } else {
        alert('英単語と和訳の両方を入力してください。');
    }
}

// 単語バンクの表示を更新
function updateWordBank() {
    const wordBank = document.getElementById('wordBank');
    
    if (wordDatabase.length === 0) {
        wordBank.innerHTML = '<p style="text-align: center; color: #666;">単語を追加してください（最低10個必要）</p>';
        return;
    }
    
    wordBank.innerHTML = wordDatabase.map((word, index) => 
        `<div class="word-item">
            <span><strong>${word.english}</strong> - ${word.japanese}</span>
            <button onclick="removeWord(${index})" style="background: #f44336; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">削除</button>
        </div>`
    ).join('');
}

// 単語を削除
function removeWord(index) {
    wordDatabase.splice(index, 1);
    updateWordBank();
    updateStartButton();
}

// スタートボタンの状態を更新
function updateStartButton() {
    const startBtn = document.getElementById('startBtn');
    if (wordDatabase.length >= 10) {
        startBtn.disabled = false;
        startBtn.textContent = `クイズを開始する（100問）`;
    } else {
        startBtn.disabled = true;
        startBtn.textContent = `単語を追加してください（${wordDatabase.length}/10）`;
    }
}

// クイズを開始
function startQuiz() {
    if (wordDatabase.length < 10) {
        alert('最低10個の単語が必要です。');
        return;
    }

    // 100問分のクイズを準備
    quizQuestions = [];
    const availableWords = [...wordDatabase];
    
    for (let i = 0; i < 100; i++) {
        if (availableWords.length === 0) {
            // 単語が足りない場合は最初からリサイクル
            availableWords.push(...wordDatabase);
        }
        
        const randomIndex = Math.floor(Math.random() * availableWords.length);
        const selectedWord = availableWords.splice(randomIndex, 1)[0];
        quizQuestions.push(selectedWord);
    }

    // 画面切り替え
    document.getElementById('setupScreen').style.display = 'none';
    document.getElementById('quizScreen').style.display = 'block';
    
    // 初期化
    currentQuestionIndex = 0;
    correctAnswers = 0;
    usedQuestions.clear();
    
    generateQuestion();
}

// 問題を生成
function generateQuestion() {
    if (currentQuestionIndex >= 100) {
        showResults();
        return;
    }

    const currentWord = quizQuestions[currentQuestionIndex];
    currentCorrectAnswer = currentWord.english;

    // 和訳を表示
    document.getElementById('questionText').textContent = `「${currentWord.japanese}」の英単語は？`;

    // 選択肢を生成（正解 + ランダムな不正解3つ）
    const options = [currentWord];
    const otherWords = wordDatabase.filter(word => word.english !== currentWord.english);
    
    while (options.length < 4 && otherWords.length > 0) {
        const randomIndex = Math.floor(Math.random() * otherWords.length);
        const randomWord = otherWords.splice(randomIndex, 1)[0];
        options.push(randomWord);
    }

    // 選択肢をシャッフル
    for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
    }

    // 選択肢をHTMLに表示
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = options.map((option, index) => 
        `<div class="option" onclick="selectOption('${option.english}', this)">
            ${option.english}
        </div>`
    ).join('');

    // 次へボタンを非表示
    document.getElementById('nextBtn').style.display = 'none';

    // 統計を更新
    updateStats();
}

// 選択肢を選択
function selectOption(selectedAnswer, element) {
    // 全ての選択肢を無効化
    const options = document.querySelectorAll('.option');
    options.forEach(option => {
        option.classList.add('disabled');
        if (option.textContent.trim() === currentCorrectAnswer) {
            option.classList.add('correct');
        } else if (option === element && selectedAnswer !== currentCorrectAnswer) {
            option.classList.add('incorrect');
        }
    });

    // 正解判定
    if (selectedAnswer === currentCorrectAnswer) {
        correctAnswers++;
        playSound('correct');
    } else {
        playSound('incorrect');
    }

    // 次へボタンを表示
    setTimeout(() => {
        document.getElementById('nextBtn').style.display = 'inline-block';
        updateStats();
    }, 1000);
}

// 次の問題へ
function nextQuestion() {
    currentQuestionIndex++;
    
    // 選択肢の状態をリセット
    const options = document.querySelectorAll('.option');
    options.forEach(option => {
        option.classList.remove('disabled', 'correct', 'incorrect');
    });

    generateQuestion();
}

// 統計を更新
function updateStats() {
    document.getElementById('currentQuestion').textContent = currentQuestionIndex + 1;
    document.getElementById('correctCount').textContent = correctAnswers;
    
    const accuracy = currentQuestionIndex >= 0 ? Math.round((correctAnswers / (currentQuestionIndex + 1)) *