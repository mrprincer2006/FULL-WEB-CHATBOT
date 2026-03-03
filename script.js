/**
 * 🎨 Holi Festival Chatbot - Celebrate the Festival of Colors!
 * Features: Holi History, Traditions, Instagram Sticker Generation
 */

const ChatStates = {
    IDLE: 'IDLE',
    HISTORY_STORY: 'HISTORY_STORY',
    TRADITION_INFO: 'TRADITION_INFO',
    STICKER_CREATION: 'STICKER_CREATION',
    CELEBRATION_CHAT: 'CELEBRATION_CHAT'
};

class HoliChatBot {
    constructor() {
        // --- Core Properties ---
        this.messages = [];
        this.isTyping = false;
        this.voiceEnabled = true;
        this.lastInputType = 'text';
        this.rateLimitMs = 1000;
        this.lastMessageTime = 0;
        this.inactivityTimeout = 60000;
        this.reminderTimer = null;

        // --- LLM Configuration ---
        this.llmConfig = {
            enabled: true,
            apiUrl: '/api/chat',
            model: 'llama-3.3-70b-versatile'
        };

        // --- State Management ---
        this.session = {
            state: ChatStates.IDLE,
            data: {},
            lastIntent: null,
            language: 'english'
        };

        // --- Voice Support ---
        this.recognition = null;
        this.isRecording = false;
        this.initVoiceRecognition();

        // --- Analytics Engine ---
        this.analytics = {
            historyQueries: 0,
            traditionQueries: 0,
            stickersCreated: 0,
            interactions: 0
        };

        // --- Holi Knowledge Base ---
        this.knowledgeBase = {
            history: {
                origin: {
                    english: "Holi, the festival of colors, has ancient origins dating back to the 4th century. It's mentioned in Sanskrit texts like the Vedas and Puranas.",
                    hindi: "होली, रंगों का त्योहार, की उत्पत्ति 4वीं शताब्दी में हुई थी। इसका उल्लेख वेद और पुराण जैसे संस्कृत ग्रंथों में मिलता है।"
                },
                holika: {
                    english: "The most popular story is of Prahlada and Holika. Prahlada's devotion to Lord Vishnu saved him from the evil Holika who tried to burn him in a pyre.",
                    hindi: "सबसे लोकप्रिय कहानी प्रहलाद और होलिका की है। प्रहलाद की भगवान विष्णु की भक्ति ने उन्हें दुष्ट होलिका से बचाया, जिसने उन्हें चिता में जलाने की कोशिश की थी।"
                },
                krishna: {
                    english: "In Mathura and Vrindavan, Holi celebrates the divine love of Radha and Krishna. Krishna's playful color throwing with Radha and gopis started this tradition.",
                    hindi: "मथुरा और वृंदावन में, होली राधा और कृष्ण के दिव्य प्रेम का जश्न मनाती है। कृष्ण का राधा और गोपियों के साथ रंग खेलना इस परंपरा की शुरुआत था।"
                },
                significance: {
                    english: "Holi signifies the victory of good over evil, arrival of spring, and a time for forgiveness, love, and new beginnings.",
                    hindi: "होली बुराई पर अच्छाई की जीत, वसंत के आगमन, और क्षमा, प्रेम और नई शुरुआत के समय का प्रतीक है।"
                }
            },
            traditions: {
                colors: {
                    english: "Colors symbolize different emotions: Red for love and fertility, Green for spring and new beginnings, Yellow for turmeric and purity, Blue for Krishna's skin.",
                    hindi: "रंग विभिन्न भावनाओं का प्रतीक हैं: लाल प्रेम और प्रजनन के लिए, हरा वसंत और नई शुरुआत के लिए, पीला हल्दी और शुद्धि के लिए, नीला कृष्ण की त्वचा के लिए।"
                },
                gujiya: {
                    english: "Gujiya is a traditional sweet dumpling filled with khoya, nuts, and dried fruits. It's especially prepared during Holi.",
                    hindi: "गुजिया एक पारंपरिक मिठाई है जो खोया, नट्स और सूखे मेवे से भरी होती है। यह खासकर होली के दौरान बनाई जाती है।"
                },
                bhang: {
                    english: "Bhang, a traditional drink made from cannabis leaves, is consumed during Holi. It's believed to enhance the festive spirit.",
                    hindi: "भांग, भांग के पत्तों से बना एक पारंपरिक पेय, होली के दौरान पिया जाता है। यह त्योहार के उत्साह को बढ़ाने के लिए माना जाता है।"
                },
                holikaDahan: {
                    english: "Holika Dahan is celebrated the night before Holi. People gather around bonfires to perform rituals and pray for evil's destruction.",
                    hindi: "होलिका दहन होली की पूर्व संध्या पर मनाया जाता है। लोग आग के चारों ओर इकट्ठा होकर अनुष्ठान करते हैं और बुराई के नाश के लिए प्रार्थना करते हैं।"
                }
            },
            celebrations: {
                india: {
                    english: "In Mathura-Vrindavan, celebrations last for 16 days. In Barsana, women playfully beat men with sticks (Lathmar Holi).",
                    hindi: "मथुरा-वृंदावन में, उत्सव 16 दिनों तक चलते हैं। बरसाना में, महिलाएं पुरुषों को लाठियों से मजाकिया तरीके से पीटती हैं (लठमार होली)।"
                },
                modern: {
                    english: "Modern Holi includes water guns, colored water balloons, and electronic music. It's celebrated worldwide as a festival of joy.",
                    hindi: "आधुनिक होली में पानी की बंदूकें, रंगीन पानी के गुब्बारे और इलेक्ट्रॉनिक संगीत शामिल हैं। यह दुनिया भर में खुशियों के त्योहार के रूप में मनाया जाता है।"
                }
            }
        };

        // --- Sticker Generator ---
        this.stickerConfig = {
            canvas: null,
            ctx: null,
            currentColor: '#FF69B4',
            currentPattern: 'confetti',
            currentFont: 'Poppins',
            colors: ['#FF69B4', '#FF6347', '#FFD700', '#32CD32', '#9370DB', '#FF1493', '#00CED1', '#FF8C00']
        };

        this.stickerTemplates = {
            happy: '🎨 Happy Holi! 🎨',
            colors: '🌈 Rang Barse! 🌈',
            love: '❤️ Holi Love ❤️',
            fun: '🎉 Color Fun! 🎉'
        };

        this.analytics = { 
            stickersCreated: 0 
        };

        // Initialize
        this.init();
    }

    // --- Initialization ---

    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadChatHistory();
        this.loadTheme();
        this.autoResizeTextarea();
        this.resetReminder();
        this.initMobileHandling();
        this.setupVisualViewport();
    }

    cacheElements() {
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.micBtn = document.getElementById('micBtn');
        this.clearChatBtn = document.getElementById('clearChatBtn');
        this.themeToggle = document.getElementById('themeToggle');
        this.attachmentBtn = document.getElementById('attachmentBtn');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.stickerBtn = document.getElementById('stickerBtn');
        this.stickerModal = document.getElementById('stickerModal');
        this.stickerCanvas = document.getElementById('stickerCanvas');
        this.stickerText = document.getElementById('stickerText');
        this.generateBtn = document.getElementById('generateSticker');
        this.downloadBtn = document.getElementById('downloadSticker');
        this.closeModal = document.getElementById('closeModal');
        this.resetSticker = document.getElementById('resetSticker');
    }

    bindEvents() {
        // Chat Events
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => this.handleKeyPress(e));
        this.messageInput.addEventListener('input', () => this.handleInputChange());
        
        // Header Events
        this.clearChatBtn.addEventListener('click', () => this.clearChat());
        this.stickerBtn.addEventListener('click', () => this.openStickerModal());
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        // Modal Events
        this.closeModal.addEventListener('click', () => this.closeStickerModal());
        this.generateBtn.addEventListener('click', () => this.generateSticker());
        this.downloadBtn.addEventListener('click', () => this.downloadSticker());
        this.resetSticker.addEventListener('click', () => this.resetSticker());
        
        // Text Input Events
        this.stickerText.addEventListener('input', () => this.updateCharCounter());
        
        // Color Selection Events
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectStickerColor(e.target.dataset.color));
        });
        
        // Pattern Selection Events
        document.querySelectorAll('.pattern-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectPattern(e.currentTarget.dataset.pattern));
        });
        
        // Font Selection Events
        document.querySelectorAll('.font-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectFont(e.target.dataset.font));
        });
        
        // Template Events
        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.applyTemplate(e.target.dataset.template));
        });
        
        // Voice Events
        if ('webkitSpeechRecognition' in window) {
            this.initVoiceRecognition();
        }
        
        // Mobile Events
        this.initMobileHandling();
        this.setupVisualViewport();
        
        // Inactivity Timer
        this.resetReminder();
    }

    // --- Voice Integration (STT) ---

    initVoiceRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;

            this.recognition.onstart = () => {
                this.isRecording = true;
                this.micBtn.classList.add('active');
                window.speechSynthesis.cancel(); // Stop bot speaking if user starts speaking
            };

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.messageInput.value = transcript;
                this.handleInputChange();
                this.sendMessage('voice');
            };

            this.recognition.onerror = (e) => {
                console.error("Speech Recognition Error:", e.error);
                this.stopRecording();
                if (e.error === 'not-allowed') alert("Microphone permission denied.");
            };

            this.recognition.onend = () => this.stopRecording();
        } else {
            console.warn("Speech Recognition not supported.");
            if (this.micBtn) this.micBtn.style.display = 'none';
        }
    }

    toggleVoiceInput() {
        if (this.isRecording) {
            this.recognition.stop();
        } else {
            // Pick language for recognition
            this.recognition.lang = this.session.language === 'hindi' ? 'hi-IN' : 'en-US';
            this.recognition.start();
        }
    }

    stopRecording() {
        this.isRecording = false;
        if (this.micBtn) this.micBtn.classList.remove('active');
    }

    // --- Voice Output (TTS) ---

    speak(text) {
        if (!this.voiceEnabled || !window.speechSynthesis) return;

        window.speechSynthesis.cancel(); // Clear queue
        const utterance = new SpeechSynthesisUtterance(text);

        // Auto-select voice language
        utterance.lang = this.session.language === 'hindi' ? 'hi-IN' : 'en-US';

        // Try to find a better voice
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.lang.startsWith(utterance.lang.split('-')[0]));
        if (preferredVoice) utterance.voice = preferredVoice;

        window.speechSynthesis.speak(utterance);
    }

    // --- Core Message Logic ---

    async sendMessage(inputType = 'text') {
        const now = Date.now();
        if (now - this.lastMessageTime < this.rateLimitMs) return;

        const rawMessage = this.messageInput.value.trim();
        if (!rawMessage || this.isTyping) return;

        const sanitizedMsg = this.sanitizeHTML(rawMessage);
        this.lastMessageTime = now;
        this.lastInputType = inputType; // Store the input type
        this.resetReminder();
        this.addMessage(sanitizedMsg, 'user');
        this.messageInput.value = '';
        this.autoResizeTextarea();

        this.showTypingIndicator();
        this.isTyping = true;

        try {
            const response = await this.generateBotResponse(sanitizedMsg);
            this.hideTypingIndicator();
            this.addMessage(response, 'bot');

            // Only speak if user sent a voice message
            if (this.lastInputType === 'voice') {
                this.speak(response);
            }
        } catch (error) {
            console.error(error);
            this.hideTypingIndicator();
            this.addMessage("I'm sorry, I'm having trouble connecting. / Maaf kijiye, humein dikkat ho rahi hai.", 'bot');
        }

        this.isTyping = false;
    }

    async generateBotResponse(userMessage) {
        const lowerMsg = userMessage.toLowerCase();
        this.analytics.interactions++;

        // Auto Language Detection
        this.detectLanguage(lowerMsg);

        // Check current state flow
        if (this.session.state !== ChatStates.IDLE) {
            return this.handleStateFlow(lowerMsg);
        }

        // Intent Detection
        const intent = this.detectIntent(lowerMsg);

        // Route to appropriate handler
        switch (intent) {
            case 'HISTORY':
                this.analytics.historyQueries++;
                return this.getHistoryResponse(lowerMsg);

            case 'TRADITIONS':
                this.analytics.traditionQueries++;
                return this.getTraditionsResponse(lowerMsg);

            case 'STICKER':
                this.session.state = ChatStates.STICKER_CREATION;
                this.openStickerModal();
                return "🎨 Let's create a beautiful Holi sticker for Instagram! Choose your colors and message!";

            case 'CELEBRATION':
                return this.getCelebrationResponse(lowerMsg);

            case 'GREETING':
                return this.getHoliGreeting();

            case 'AI_FALLBACK':
                const aiResponse = await this.fetchLLMResponse(lowerMsg);
                if (aiResponse) return this.formatHoliStyle(aiResponse);
                return this.getTransitionPhrase('fallback');

            default:
                return this.getTransitionPhrase('fallback');
        }
    }

    // --- Holi-Specific Methods ---

    detectIntent(msg) {
        // Priority 1: Sticker Creation
        if (this.matchAny(msg, ['sticker', 'create', 'instagram', 'photo', 'image', 'banayein', 'sticker banao'])) return 'STICKER';

        // Priority 2: History Queries
        if (this.matchAny(msg, ['history', 'origin', 'story', 'kahani', 'itihaas', 'holika', 'prahlad', 'krishna'])) return 'HISTORY';

        // Priority 3: Tradition Queries
        if (this.matchAny(msg, ['tradition', 'custom', 'ritual', 'colors', 'gujiya', 'bhang', 'holika dahan', 'parampara', 'ritual'])) return 'TRADITIONS';

        // Priority 4: Celebration Queries
        if (this.matchAny(msg, ['celebration', 'celebrate', 'how to', 'where', 'mathura', 'vrindavan', 'barsana', 'manayein'])) return 'CELEBRATION';

        // Priority 5: Greetings
        if (this.matchAny(msg, ['hello', 'hi', 'hey', 'namaste', 'happy holi', 'holi ki badhai'])) return 'GREETING';

        // Priority 6: AI Fallback
        const guardrail = this.checkGuardrails(msg);
        if (this.llmConfig.enabled && guardrail.triggerLLM) return 'AI_FALLBACK';

        return 'UNKNOWN';
    }

    getHistoryResponse(msg) {
        const lang = this.session.language;
        let response = '';

        if (this.matchAny(msg, ['origin', 'beginning', 'shururat', 'utpatti'])) {
            response = this.knowledgeBase.history.origin[lang];
        } else if (this.matchAny(msg, ['holika', 'prahlad', 'evil'])) {
            response = this.knowledgeBase.history.holika[lang];
        } else if (this.matchAny(msg, ['krishna', 'radha', 'mathura', 'vrindavan'])) {
            response = this.knowledgeBase.history.krishna[lang];
        } else if (this.matchAny(msg, ['meaning', 'significance', 'importance', 'mahatva'])) {
            response = this.knowledgeBase.history.significance[lang];
        } else {
            // General history overview
            response = lang === 'hindi' ? 
                "🎨 होली का इतिहास बहुत प्राचीन है! इसमें प्रहलाद-होलिका की कहानी, कृष्ण-राधा का प्रेम, और बुराई पर अच्छाई की जीत शामिल है। कौन सी कहानी जानना चाहते हैं?" :
                "🎨 Holi's history is ancient! It includes the Prahlada-Holika story, Krishna-Radha's love, and good over evil. Which story would you like to know about?";
        }

        return response + " " + (lang === 'hindi' ? "और जानकारी के लिए पूछें!" : "Ask for more details!");
    }

    getTraditionsResponse(msg) {
        const lang = this.session.language;
        let response = '';

        if (this.matchAny(msg, ['color', 'rang', 'meaning'])) {
            response = this.knowledgeBase.traditions.colors[lang];
        } else if (this.matchAny(msg, ['gujiya', 'sweet', 'mithai'])) {
            response = this.knowledgeBase.traditions.gujiya[lang];
        } else if (this.matchAny(msg, ['bhang', 'drink'])) {
            response = this.knowledgeBase.traditions.bhang[lang];
        } else if (this.matchAny(msg, ['holika dahan', 'bonfire', 'fire'])) {
            response = this.knowledgeBase.traditions.holikaDahan[lang];
        } else {
            response = lang === 'hindi' ?
                "🎉 होली की परंपराएं बहुत रंगीन हैं! रंगों का महत्व, गुजिया, भांग, और होलिका दहन। कौन सी परंपरा के बारे में जानना चाहते हैं?" :
                "🎉 Holi traditions are colorful! Color meanings, gujiya sweets, bhang drink, and Holika Dahan bonfire. Which tradition interests you?";
        }

        return response + " " + (lang === 'hindi' ? "और भी पूछें!" : "Ask for more!");
    }

    getCelebrationResponse(msg) {
        const lang = this.session.language;
        let response = '';

        if (this.matchAny(msg, ['mathura', 'vrindavan', 'barsana'])) {
            response = this.knowledgeBase.celebrations.india[lang];
        } else if (this.matchAny(msg, ['modern', 'today', 'water gun', 'balloon'])) {
            response = this.knowledgeBase.celebrations.modern[lang];
        } else {
            response = lang === 'hindi' ?
                "🎊 होली का जश्न भारत भर में अलग-अलग तरीके से मनाया जाता है! मथुरा-वृंदावन में 16 दिनों तक, बरसाना में लठमार होली, और आधुनिक तरीकों से। कहाँ मनाना चाहते हैं?" :
                "🎊 Holi is celebrated differently across India! 16 days in Mathura-Vrindavan, Lathmar Holi in Barsana, and modern celebrations worldwide. Where would you like to celebrate?";
        }

        return response;
    }

    getHoliGreeting() {
        const lang = this.session.language;
        const greetings = [
            lang === 'hindi' ? "🎨 होली की हार्दिक शुभकामनाएं! आज के रंगीन दिन पर क्या जानना चाहते हैं?" : "🎨 Happy Holi! What would you like to know about this colorful festival?",
            lang === 'hindi' ? "🌈 रंगों का त्योहार आया है! इतिहास, परंपराएं, या स्टिकर बनाना है?" : "🌈 The festival of colors is here! History, traditions, or create stickers?",
            lang === 'hindi' ? "🎉 हैप्पी होली! मैं आपकी मदद करूंगा होली के बारे में जानने में!" : "🎉 Happy Holi! I'll help you learn about the festival!"
        ];
        return greetings[Math.floor(Math.random() * greetings.length)];
    }

    getTransitionPhrase(key) {
        const dict = {
            fallback: { 
                english: "🎨 I'm here to share the joy of Holi! Ask me about history, traditions, celebrations, or let's create Instagram stickers!", 
                hindi: "🎨 मैं होली की खुशियां बांटने के लिए हूं! इतिहास, परंपराएं, उत्सव, या इंस्टाग्राम स्टिकर बनाने के लिए पूछें!" 
            }
        };
        return dict[key][this.session.language];
    }

    // --- Enhanced Sticker Generator Methods ---

    openStickerModal() {
        this.stickerModal.classList.add('active');
        this.stickerConfig.canvas = this.stickerCanvas;
        this.stickerConfig.ctx = this.stickerCanvas.getContext('2d');
        this.initializeCanvas();
        this.updateCharCounter();
    }

    closeStickerModal() {
        this.stickerModal.classList.remove('active');
        this.session.state = ChatStates.IDLE;
    }

    updateCharCounter() {
        const counter = document.querySelector('.char-counter');
        const currentLength = this.stickerText.value.length;
        counter.textContent = `${currentLength}/50`;
        
        if (currentLength >= 45) {
            counter.style.color = '#FF6347';
        } else if (currentLength >= 35) {
            counter.style.color = '#FFD700';
        } else {
            counter.style.color = 'var(--text-secondary)';
        }
    }

    selectStickerColor(color) {
        this.stickerConfig.currentColor = color;
        
        // Update UI
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-color="${color}"]`).classList.add('active');
    }

    selectPattern(pattern) {
        this.stickerConfig.currentPattern = pattern;
        
        // Update UI
        document.querySelectorAll('.pattern-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-pattern="${pattern}"]`).classList.add('active');
    }

    selectFont(font) {
        this.stickerConfig.currentFont = font;
        
        // Update UI
        document.querySelectorAll('.font-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-font="${font}"]`).classList.add('active');
    }

    applyTemplate(templateName) {
        const templateText = this.stickerTemplates[templateName];
        this.stickerText.value = templateText;
        this.updateCharCounter();
        
        // Add animation effect
        this.stickerText.style.transform = 'scale(1.05)';
        setTimeout(() => {
            this.stickerText.style.transform = 'scale(1)';
        }, 200);
    }

    resetSticker() {
        this.stickerText.value = '';
        this.stickerConfig.currentColor = '#FF69B4';
        this.stickerConfig.currentPattern = 'confetti';
        this.stickerConfig.currentFont = 'Poppins';
        
        // Reset UI
        this.updateCharCounter();
        
        // Reset color selection
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector('[data-color="#FF69B4"]').classList.add('active');
        
        // Reset pattern selection
        document.querySelectorAll('.pattern-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector('[data-pattern="confetti"]').classList.add('active');
        
        // Reset font selection
        document.querySelectorAll('.font-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector('[data-font="Poppins"]').classList.add('active');
        
        // Reinitialize canvas
        this.initializeCanvas();
        
        this.addMessage("🔄 Sticker creator reset! Start fresh with your design!", 'bot');
    }

    initializeCanvas() {
        const ctx = this.stickerConfig.ctx;
        const canvas = this.stickerConfig.canvas;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#FFF0F5');
        gradient.addColorStop(0.5, '#FFE4E1');
        gradient.addColorStop(1, '#F0E68C');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add decorative pattern
        this.drawPattern(this.stickerConfig.currentPattern);
        
        // Add default text
        ctx.fillStyle = '#FF1493';
        ctx.font = 'bold 32px Dancing Script';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🎨 Happy Holi! 🎨', canvas.width / 2, canvas.height / 2);
    }

    generateSticker() {
        const ctx = this.stickerConfig.ctx;
        const canvas = this.stickerConfig.canvas;
        const text = this.stickerText.value || '🎨 Happy Holi! 🎨';
        
        // Clear and redraw background
        this.initializeCanvas();
        
        // Add color splash effect
        this.drawColorSplash();
        
        // Add text with selected font
        ctx.save();
        ctx.fillStyle = this.stickerConfig.currentColor;
        ctx.font = `bold 36px ${this.stickerConfig.currentFont}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        // Word wrap for long text
        const words = text.split(' ');
        const lineHeight = 40;
        const maxWidth = canvas.width - 40;
        let line = '';
        let y = canvas.height / 2 - 20;
        
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            
            if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, canvas.width / 2, y);
                line = words[n] + ' ';
                y += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, canvas.width / 2, y);
        ctx.restore();
        
        // Add decorative elements
        this.drawDecorations();
        
        this.analytics.stickersCreated++;
        this.addMessage("🎨 Your Holi sticker is ready! Download it and share on Instagram!", 'bot');
    }

    drawPattern(patternType) {
        const ctx = this.stickerConfig.ctx;
        const canvas = this.stickerConfig.canvas;
        
        ctx.save();
        ctx.globalAlpha = 0.1;
        
        switch (patternType) {
            case 'confetti':
                for (let i = 0; i < 50; i++) {
                    ctx.fillStyle = this.stickerConfig.colors[Math.floor(Math.random() * this.stickerConfig.colors.length)];
                    const x = Math.random() * canvas.width;
                    const y = Math.random() * canvas.height;
                    const size = Math.random() * 8 + 4;
                    ctx.fillRect(x, y, size, size);
                }
                break;
                
            case 'splash':
                for (let i = 0; i < 20; i++) {
                    ctx.fillStyle = this.stickerConfig.colors[Math.floor(Math.random() * this.stickerConfig.colors.length)];
                    const x = Math.random() * canvas.width;
                    const y = Math.random() * canvas.height;
                    const radius = Math.random() * 15 + 5;
                    ctx.beginPath();
                    ctx.arc(x, y, radius, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
                
            case 'radial':
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                for (let i = 0; i < 8; i++) {
                    const angle = (Math.PI * 2 / 8) * i;
                    const gradient = ctx.createLinearGradient(centerX, centerY, 
                        centerX + Math.cos(angle) * 150, centerY + Math.sin(angle) * 150);
                    gradient.addColorStop(0, this.stickerConfig.colors[i % this.stickerConfig.colors.length]);
                    gradient.addColorStop(1, 'transparent');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
                break;
                
            case 'hearts':
                ctx.font = '20px serif';
                for (let i = 0; i < 15; i++) {
                    ctx.fillStyle = this.stickerConfig.colors[Math.floor(Math.random() * this.stickerConfig.colors.length)];
                    const x = Math.random() * canvas.width;
                    const y = Math.random() * canvas.height;
                    ctx.fillText('❤️', x, y);
                }
                break;
        }
        
        ctx.restore();
    }

    drawColorSplash() {
        const ctx = this.stickerConfig.ctx;
        const canvas = this.stickerConfig.canvas;
        
        ctx.save();
        ctx.globalAlpha = 0.3;
        
        // Create color splashes
        for (let i = 0; i < 8; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const radius = Math.random() * 30 + 20;
            
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, this.stickerConfig.colors[Math.floor(Math.random() * this.stickerConfig.colors.length)]);
            gradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }

    drawDecorations() {
        const ctx = this.stickerConfig.ctx;
        const canvas = this.stickerConfig.canvas;
        
        ctx.save();
        ctx.font = '24px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Add corner decorations
        const decorations = ['🎨', '🌈', '✨', '🎉'];
        const positions = [
            [30, 30], [canvas.width - 30, 30],
            [30, canvas.height - 30], [canvas.width - 30, canvas.height - 30]
        ];
        
        decorations.forEach((emoji, index) => {
            ctx.fillText(emoji, positions[index][0], positions[index][1]);
        });
        
        ctx.restore();
    }

    downloadSticker() {
        const canvas = this.stickerConfig.canvas;
        const link = document.createElement('a');
        link.download = 'holi-sticker-instagram.png';
        link.href = canvas.toDataURL();
        link.click();
        
        this.addMessage("📥 Your Holi sticker has been downloaded! Share it on Instagram with #Holi2024!", 'bot');
    }

    handleQuickAction(action) {
        switch (action) {
            case 'history':
                this.messageInput.value = 'Tell me about Holi history';
                this.sendMessage();
                break;
            case 'traditions':
                this.messageInput.value = 'What are Holi traditions?';
                this.sendMessage();
                break;
            case 'sticker':
                this.openStickerModal();
                break;
        }
    }

    formatHoliStyle(text) {
        // Holi-themed text formatter
        let clean = text;
        
        // Add Holi emojis and festive language
        if (!clean.includes('🎨') && !clean.includes('🌈')) {
            clean = '🎨 ' + clean + ' 🎨';
        }
        
        // Remove markdown symbols
        clean = clean.replace(/\*\*|\*|#|•|✅|💡|🔹|>/g, '');
        
        // Ensure festive tone
        clean = clean.replace(/!/g, '🎉');
        
        return clean.trim();
    }

    checkGuardrails(msg) {
        const triggers = {
            emotional: ['not sure', 'doubt', 'really', 'sach mein', 'bharosa', 'trust'],
            advanced: ['benefit', 'how', 'why', 'difference', 'compare', 'faida', 'kyun']
        };

        const isComplex = msg.split(' ').length > 6;
        const hasEmotionalDoubt = this.matchAny(msg, triggers.emotional);
        const isAdvancedQuery = this.matchAny(msg, triggers.advanced);

        return {
            triggerLLM: isComplex || hasEmotionalDoubt || isAdvancedQuery,
            reason: isAdvancedQuery ? 'complex_query' : 'general'
        };
    }

    async fetchLLMResponse(userMessage) {
        try {
            const response = await fetch(this.llmConfig.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: userMessage
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                console.error("Backend Error:", response.status, JSON.stringify(errData));
                return null;
            }

            const data = await response.json();
            if (data.choices && data.choices[0]) {
                return data.choices[0].message.content;
            }
            return null;
        } catch (error) {
            console.error("LLM Connection Error:", error);
            return null;
        }
    }

    // --- State Handlers ---

    handleStateFlow(msg) {
        switch (this.session.state) {
            case ChatStates.STICKER_CREATION:
                return this.handleStickerFlow(msg);
            default:
                this.resetSession();
                return "I lost track. Please restart. / Main bhool gaya, kripya fir se kahein.";
        }
    }

    handleStickerFlow(msg) {
        if (msg.toLowerCase().includes('close') || msg.toLowerCase().includes('done')) {
            this.closeStickerModal();
            this.resetSession();
            return "🎨 Sticker creation complete! Feel free to create more or ask about Holi!";
        }
        return "🎨 Use the sticker creator to customize your Holi message! Click 'Generate Sticker' when ready!";
    }

    // --- Language Detection ---

    detectLanguage(msg) {
        const hindiKeywords = ['hai', 'ka', 'ko', 'se', 'tha', 'mein', 'kya', 'hu', 'kyun', 'nahi', 'dard', 'shehar', 'shehr', 'naam', 'ji', 'paisa', 'holi', 'rang', 'tyohar', 'mahotsav'];
        const words = msg.split(/\s+/);
        const hindiMatches = words.filter(w => hindiKeywords.includes(w)).length;

        // Heuristic: If significant hindi keywords or specific characters detected
        if (hindiMatches > 0 || /[^\u0000-\u007F]+/.test(msg)) {
            this.session.language = 'hindi';
        } else {
            this.session.language = 'english';
        }
    }

    // --- Helper Methods ---

    matchAny(msg, keywords) { 
        return keywords.some(k => msg.includes(k)); 
    }
    
    sanitizeHTML(str) { 
        const temp = document.createElement('div'); 
        temp.textContent = str; 
        return temp.innerHTML; 
    }
    
    resetSession() { 
        this.session.state = ChatStates.IDLE; 
        this.session.data = {}; 
    }

    resetReminder() {
        if (this.reminderTimer) clearTimeout(this.reminderTimer);
        this.reminderTimer = setTimeout(() => {
            if (this.session.state === ChatStates.IDLE && this.messages.length > 0) {
                this.addMessage(this.getTransitionPhrase('fallback'), 'bot');
            }
        }, this.inactivityTimeout);
    }

    // --- Mobile & UI Methods (keeping existing ones) ---

    initMobileHandling() {
        if (window.innerWidth <= 640) {
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        }

        this.messageInput.addEventListener('focus', () => {
            setTimeout(() => {
                this.scrollToBottom();
            }, 300);
        });
    }

    setupVisualViewport() {
        if (!window.visualViewport) return;

        const appWrapper = document.querySelector('.app-wrapper');
        const container = document.querySelector('.chat-container');

        const handleResize = () => {
            const viewport = window.visualViewport;

            if (window.innerWidth <= 768) {
                appWrapper.style.height = `${viewport.height}px`;
                window.scrollTo(0, 0);
                this.scrollToBottom();
            } else {
                appWrapper.style.height = '';
            }
        };

        window.visualViewport.addEventListener('resize', handleResize);
        window.visualViewport.addEventListener('scroll', handleResize);

        this.messageInput.addEventListener('focus', () => {
            setTimeout(handleResize, 300);
        });

        this.messageInput.addEventListener('blur', () => {
            setTimeout(handleResize, 100);
        });
    }

    // --- UI Event Handlers (keeping existing ones) ---

    handleKeyPress(e) { 
        if (e.key === 'Enter' && !e.shiftKey) { 
            e.preventDefault(); 
            this.sendMessage(); 
        } 
    }
    
    handleInputChange() { 
        this.autoResizeTextarea(); 
        this.sendBtn.disabled = !this.messageInput.value.trim(); 
    }
    
    autoResizeTextarea() { 
        this.messageInput.style.height = 'auto'; 
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px'; 
    }
    
    showTypingIndicator() { 
        this.typingIndicator.classList.add('active'); 
        this.scrollToBottom(); 
    }
    
    hideTypingIndicator() { 
        this.typingIndicator.classList.remove('active'); 
    }
    
    scrollToBottom() { 
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight; 
    }

    addMessage(content, sender) {
        const message = { 
            id: Date.now(), 
            content, 
            sender, 
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        };
        this.messages.push(message);
        this.renderMessage(message);
        this.saveChatHistory();
        this.scrollToBottom();
    }

    renderMessage(message) {
        const div = document.createElement('div');
        div.className = `message ${message.sender}`;
        div.innerHTML = `
            <div class="message-avatar"><i class="fas fa-${message.sender === 'user' ? 'user' : 'palette'}"></i></div>
            <div class="message-content">
                <p>${message.content}</p>
                <div class="message-time">${message.timestamp}</div>
            </div>
        `;
        this.chatMessages.appendChild(div);
    }

    clearChat() { 
        if (confirm('Clear chat history?')) { 
            this.messages = []; 
            this.renderWelcome(); 
            this.saveChatHistory(); 
        } 
    }
    
    renderWelcome() { 
        this.chatMessages.innerHTML = `<div class="welcome-message"><div class="bot-avatar holi-avatar"><i class="fas fa-palette"></i></div><div class="message-content"><p>${this.getHoliGreeting()}</p><div class="quick-actions"><button class="quick-btn" data-action="history">📚 Holi History</button><button class="quick-btn" data-action="traditions">🎉 Traditions</button><button class="quick-btn" data-action="sticker">📸 Create Sticker</button></div></div></div>`; 
        
        // Re-bind quick action buttons
        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleQuickAction(e.target.dataset.action));
        });
    }
    
    toggleTheme() { 
        const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; 
        document.documentElement.setAttribute('data-theme', t); 
        localStorage.setItem('theme', t); 
    }
    
    loadTheme() { 
        const t = localStorage.getItem('theme') || 'light'; 
        document.documentElement.setAttribute('data-theme', t); 
    }
    
    saveChatHistory() { 
        localStorage.setItem('holiChatHistory', JSON.stringify(this.messages)); 
    }
    
    loadChatHistory() {
        const h = localStorage.getItem('holiChatHistory');
        if (h) { 
            this.messages = JSON.parse(h); 
            if (this.messages.length === 0) this.renderWelcome(); 
            else { 
                this.chatMessages.innerHTML = ''; 
                this.messages.forEach(m => this.renderMessage(m)); 
            } 
            this.scrollToBottom(); 
        } else this.renderWelcome();
    }

    handleAttachment() {
        const input = document.createElement('input'); 
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => { 
            const f = e.target.files[0]; 
            if (f) {
                this.addMessage(`� Image attached: ${f.name}`, 'user');
                this.addMessage("🎨 Beautiful image! I can help create a Holi sticker with this inspiration!", 'bot');
            }
        };
        input.click();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new HoliChatBot();
    // Pre-load voices
    window.speechSynthesis.getVoices();
});
