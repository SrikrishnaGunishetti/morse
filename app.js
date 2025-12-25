document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const body = document.body;
    const textInput = document.getElementById('text-input');
    const morseInput = document.getElementById('morse-input');
    const textCharCount = document.getElementById('text-char-count');
    const morseCharCount = document.getElementById('morse-char-count');
    const morseGrid = document.getElementById('morse-grid');

    // Buttons
    const themeButtons = document.querySelectorAll('.theme-btn');
    const copyTextBtn = document.getElementById('copy-text-btn');
    const copyMorseBtn = document.getElementById('copy-morse-btn');
    const clearAllBtn = document.getElementById('clear-all-btn');
    const playAudioBtn = document.getElementById('play-audio-btn');

    // --- Morse Code Data & Logic ---
    const MORSE_CODE_MAP = {
        'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.', 'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-', 'Y': '-.--', 'Z': '--..',
        '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.', '0': '-----',
        ' ': '/'
    };
    const REVERSE_MORSE_MAP = Object.fromEntries(Object.entries(MORSE_CODE_MAP).map(([k, v]) => [v, k]));

    const encode = (text) => text.toUpperCase().split('').map(char => MORSE_CODE_MAP[char] || '').join(' ');
    const decode = (morse) => morse.split(' ').map(code => REVERSE_MORSE_MAP[code] || '').join('');

    // --- Core Functionality ---
    const updateCounts = () => {
        const textLength = textInput.value.length;
        const morseLength = morseInput.value.length;
        textCharCount.textContent = `${textLength} character${textLength !== 1 ? 's' : ''}`;
        morseCharCount.textContent = `${morseLength} character${morseLength !== 1 ? 's' : ''}`;
    };

    const handleInput = () => {
        const text = textInput.value;
        morseInput.value = encode(text);
        updateCounts();
    };
    
    // --- UI Interactions ---

    // Theme Switcher
    const setTheme = (theme) => {
        body.className = `theme-${theme}`;
        themeButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.theme === theme));
        localStorage.setItem('morse-theme', theme);
    };

    themeButtons.forEach(btn => {
        btn.addEventListener('click', () => setTheme(btn.dataset.theme));
    });

    const savedTheme = localStorage.getItem('morse-theme') || 'light';
    setTheme(savedTheme);

    // Copy to Clipboard
    const copyToClipboard = (text, btn) => {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            const originalIcon = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i>';
            showCopiedFeedback();
            setTimeout(() => {
                btn.innerHTML = originalIcon;
            }, 2000);
        });
    };
    
    const showCopiedFeedback = () => {
        const feedback = document.createElement('div');
        feedback.className = 'copied-feedback';
        feedback.textContent = 'Copied to clipboard!';
        document.body.appendChild(feedback);
        setTimeout(() => {
            feedback.classList.add('show');
            setTimeout(() => {
                feedback.classList.remove('show');
                setTimeout(() => {
                    feedback.remove();
                }, 500);
            }, 2000);
        }, 10);
    };

    copyTextBtn.addEventListener('click', () => copyToClipboard(textInput.value, copyTextBtn));
    copyMorseBtn.addEventListener('click', () => copyToClipboard(morseInput.value, copyMorseBtn));

    // Clear All
    clearAllBtn.addEventListener('click', () => {
        textInput.value = '';
        morseInput.value = '';
        updateCounts();
    });

    // --- Morse Reference Grid ---
    const populateGrid = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
        chars.forEach(char => {
            const item = document.createElement('div');
            item.className = 'grid-item';
            item.innerHTML = `<div class="grid-char">${char}</div><div class="grid-morse">${MORSE_CODE_MAP[char]}</div>`;
            item.addEventListener('click', () => {
                textInput.value += char;
                handleInput();
                textInput.focus();
            });
            morseGrid.appendChild(item);
        });
    };
    populateGrid();

    // --- Web Audio API for Morse Sound ---
    let audioCtx;
    let gainNode;
    let oscillator;
    let isPlaying = false;
    let morseQueue = [];

    const initAudio = () => {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            gainNode = audioCtx.createGain();
            gainNode.connect(audioCtx.destination);
        }
    };

    const playTone = (duration, freq = 600) => {
        return new Promise(resolve => {
            if (!audioCtx) initAudio();
            oscillator = audioCtx.createOscillator();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
            oscillator.connect(gainNode);

            gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
            oscillator.start();

            setTimeout(() => {
                oscillator.stop();
                resolve();
            }, duration);
        });
    };

    const playMorseSequence = async () => {
        if (morseQueue.length === 0) {
            isPlaying = false;
            playAudioBtn.innerHTML = '<i class="fas fa-play"></i> Play Morse';
            playAudioBtn.classList.remove('playing');
            playAudioBtn.disabled = false;
            return;
        }

        const unit = 80; // ms
        const symbol = morseQueue.shift();

        switch (symbol) {
            case '.':
                await playTone(unit);
                await new Promise(r => setTimeout(r, unit)); // Inter-symbol gap
                break;
            case '-':
                await playTone(unit * 3);
                await new Promise(r => setTimeout(r, unit)); // Inter-symbol gap
                break;
            case ' ':
                await new Promise(r => setTimeout(r, unit * 3)); // Inter-letter gap
                break;
            case '/':
                await new Promise(r => setTimeout(r, unit * 7)); // Inter-word gap
                break;
        }

        if (isPlaying) {
            playMorseSequence();
        }
    };

    playAudioBtn.addEventListener('click', () => {
        initAudio();
        if (isPlaying) {
            isPlaying = false;
            morseQueue = [];
            if(oscillator) oscillator.stop();
            playAudioBtn.innerHTML = '<i class="fas fa-play"></i> Play Morse';
            playAudioBtn.classList.remove('playing');
            playAudioBtn.disabled = false;
        } else {
            const morseToPlay = morseInput.value;
            if (!morseToPlay) return;
            
            isPlaying = true;
            playAudioBtn.innerHTML = '<i class="fas fa-stop"></i> Stop';
            playAudioBtn.classList.add('playing');
            playAudioBtn.disabled = true; // Disable until sequence starts

            // Flatten the morse code into a playable sequence
            morseQueue = morseToPlay.split('');

            setTimeout(() => {
                playAudioBtn.disabled = false; // Re-enable stop button
                playMorseSequence();
            }, 100);
        }
    });

    // --- Event Listeners ---
    textInput.addEventListener('input', handleInput);

    // Initial state
    updateCounts();
});
