/**
 * RCA Wellness - Smart AI Business Assistant
 * Senior Engineer Refactor: Voice (STT/TTS) & Hindi Language Support
 */

const ChatStates = {
    IDLE: 'IDLE',
    LEAD_CAPTURE: 'LEAD_CAPTURE',
    COMPLAINT_LOGGING: 'COMPLAINT_LOGGING',
    SALES_FUNNEL: 'SALES_FUNNEL',
    BUSINESS_FLOW: 'BUSINESS_FLOW'
};

class ChatBot {
    constructor() {
        // --- Core Properties ---
        this.messages = [];
        this.isTyping = false;
        this.businessMode = true;
        this.voiceEnabled = true; // Bot will speak IF input was voice
        this.lastInputType = 'text'; // Track if last input was 'voice' or 'text'
        this.rateLimitMs = 1000;
        this.lastMessageTime = 0;
        this.inactivityTimeout = 60000;
        this.reminderTimer = null;

        // --- LLM Configuration (Open Source via Groq/DeepSeek) ---
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
            leadCooldown: 0,
            language: 'english'
        };

        // --- Voice Support ---
        this.recognition = null;
        this.isRecording = false;
        this.initVoiceRecognition();

        // --- Analytics Engine ---
        this.analytics = {
            leads: 0,
            complaints: 0,
            productViews: {},
            interactions: 0
        };

        // --- Knowledge Base ---
        this.knowledgeBase = {
            company: {
                name: "RCA Wellness Pvt. Ltd.",
                about: {
                    english: "RCA Wellness Pvt. Ltd. is a registered direct selling company under the Companies Act, 2013.",
                    hindi: "RCA Wellness Pvt. Ltd. Companies Act, 2013 ke tehat ek registered direct selling company hai."
                },
                mission: {
                    english: "Our mission is healthy India, prosperous India via Ayurveda.",
                    hindi: "Humara mission Ayurveda ke zariye swasth Bharat aur samriddh Bharat hai."
                }
            },
            products: [
                {
                    id: "hb_booster", name: "HB Booster", tags: ["blood", "hemoglobin", "energy", "weakness", "khoon", "takat", "kamzori"],
                    benefits: { english: "Improves hemoglobin and energy levels.", hindi: "Hemoglobin aur energy badhane mein madad karta hai." },
                    testimonial: { english: "Energy levels improved within 15 days!", hindi: "15 dinon mein hi energy badh gayi!" }, price: 1200
                },
                {
                    id: "liver_booster", name: "Liver Booster", tags: ["liver", "digestion", "detox", "fatty", "pachan", "pet", "liver"],
                    benefits: { english: "Supports liver function and digestion.", hindi: "Liver aur pachan mein sahayak hai." },
                    testimonial: { english: "Best natural detox for my digestion issues.", hindi: "Pachan ke liye sabse accha natural upaay." }, price: 950
                },
                {
                    id: "tulsi_drops", name: "Tulsi Drops", tags: ["immunity", "cold", "flu", "cough", "fever", "sardi", "khansi", "bukhar"],
                    benefits: { english: "Natural immunity booster with 5 types of Tulsi.", hindi: "5 prakar ki Tulsi wala natural immunity booster." },
                    testimonial: { english: "My kids haven't had a cold this season!", hindi: "Is season mere bachon ko sardi nahi hui!" }, price: 450
                },
                {
                    id: "ortho_veda", name: "Ortho Veda", tags: ["joint", "pain", "bone", "knee", "arthritis", "dard", "ghutna", "joron"],
                    benefits: { english: "Relief from joint and muscle pain naturally.", hindi: "Joron aur manspeshiyon ke dard mein rahat." },
                    testimonial: { english: "My knee pain is significantly reduced.", hindi: "Ghutne ke dard mein bahut aaram mila." }, price: 1500
                },
                {
                    id: "digest_care", name: "Digest Care", tags: ["stomach", "gas", "constipation", "acidity", "kabz", "pet", "acid"],
                    benefits: { english: "Relief from acidity and digestive issues.", hindi: "Acidity aur pachan ki samasyaon se rahat." },
                    testimonial: { english: "Finally, a natural solution for my chronic gas.", hindi: "Purani gas ke liye ek natural ilaaj mil gaya." }, price: 800
                }
            ],
            contact: { phone: "+91 XXXXX XXXXX", email: "info@rcawellness.in" }
        };

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
        this.micBtn = document.getElementById('micBtn'); // New Mic Button
        this.clearChatBtn = document.getElementById('clearChatBtn');
        this.themeToggle = document.getElementById('themeToggle');
        this.attachmentBtn = document.getElementById('attachmentBtn');
        this.typingIndicator = document.getElementById('typingIndicator');
    }

    bindEvents() {
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.micBtn.addEventListener('click', () => this.toggleVoiceInput());
        this.messageInput.addEventListener('keydown', (e) => this.handleKeyPress(e));
        this.messageInput.addEventListener('input', () => this.handleInputChange());
        this.clearChatBtn.addEventListener('click', () => this.clearChat());
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        this.attachmentBtn.addEventListener('click', () => this.handleAttachment());
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

        // 0. Auto Language Detection
        this.detectLanguage(lowerMsg);

        // 1. Cooldown management
        if (this.session.leadCooldown > 0) this.session.leadCooldown--;

        // 2. Check current state flow
        if (this.session.state !== ChatStates.IDLE) {
            return this.handleStateFlow(lowerMsg);
        }

        // 3. Fix "yes" problem
        if (['yes', 'ok', 'sure', 'han', 'ha', 'theek hai'].includes(lowerMsg)) {
            return this.getTransitionPhrase('generic_affirmation');
        }

        // 4. Intent Detection
        const intent = this.detectIntent(lowerMsg);

        // 5. Routing
        switch (intent) {
            case 'COMPLAINT':
                this.session.state = ChatStates.COMPLAINT_LOGGING;
                this.session.data = { step: 1, priority: this.checkPriority(lowerMsg) };
                return this.getTransitionPhrase('complaint_intro');

            case 'BUSINESS_FLOW':
                this.session.state = ChatStates.BUSINESS_FLOW;
                this.session.data = { step: 1 };
                return this.handleBusinessFlow(""); // Initial trigger doesn't need message

            case 'SALES':
                this.session.state = ChatStates.SALES_FUNNEL;
                this.session.data = { step: 1, query: lowerMsg };
                return this.getTransitionPhrase('sales_intro');

            case 'PRODUCT_LIST':
                return this.getProductListResponse();

            case 'ABOUT':
                return this.knowledgeBase.company.about[this.session.language] + " " + this.knowledgeBase.company.mission[this.session.language];

            case 'CONTACT':
                return this.getTransitionPhrase('contact_info');

            case 'AI_FALLBACK':
                const aiResponse = await this.fetchLLMResponse(lowerMsg);
                if (aiResponse) return this.formatRCAStyle(aiResponse);
                return this.getTransitionPhrase('fallback');

            case 'GREETING':
                return this.getTransitionPhrase('welcome');

            default:
                if (lowerMsg.includes("not helpful") || lowerMsg.includes("galat")) {
                    this.session.state = ChatStates.SALES_FUNNEL;
                    this.session.data = { step: 1, query: "" };
                    return this.getTransitionPhrase('restart_sales');
                }
                return this.getTransitionPhrase('fallback');
        }
    }

    // --- AI Intelligence & Guardrails ---

    checkGuardrails(msg) {
        const triggers = {
            emotional: ['not sure', 'doubt', 'work', 'really', 'sach mein', 'bharosa', 'trust'],
            objection: ['mlm', 'risk', 'income', 'illegal', 'scheme', 'dhokha'],
            advanced: ['benefit', 'how', 'why', 'ayurveda', 'difference', 'compare', 'faida', 'kyun']
        };

        const isComplex = msg.split(' ').length > 6;
        const hasEmotionalDoubt = this.matchAny(msg, triggers.emotional);
        const hasHighObjection = this.matchAny(msg, triggers.objection);
        const isAdvancedQuery = this.matchAny(msg, triggers.advanced);

        return {
            triggerLLM: isComplex || hasEmotionalDoubt || hasHighObjection || isAdvancedQuery,
            reason: hasHighObjection ? 'high_objection' : (isAdvancedQuery ? 'complex_query' : 'general')
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

    formatRCAStyle(text) {
        // Hype Removal & Style Formatter
        let clean = text;
        const hypeWords = [/amazing/gi, /miraculous/gi, /instant/gi, /guaranteed/gi, /magic/gi, /best in the world/gi];
        hypeWords.forEach(word => clean = clean.replace(word, 'effective'));

        // Remove markdown symbols (Double safety)
        clean = clean.replace(/\*\*|\*|#|•|✅|💡|🔹|>/g, '');

        // Ensure calm tone (remove excessive exclamation marks)
        clean = clean.replace(/!{2,}/g, '.').replace(/!/g, '.');

        return clean.trim();
    }

    // --- Intent & Language Logic ---

    detectLanguage(msg) {
        const hindiKeywords = ['hai', 'ka', 'ko', 'se', 'tha', 'mein', 'kya', 'hu', 'kyun', 'nahi', 'dard', 'shehar', 'shehr', 'naam', 'ji', 'paisa'];
        const words = msg.split(/\s+/);
        const hindiMatches = words.filter(w => hindiKeywords.includes(w)).length;

        // Heuristic: If significant hindi keywords or specific characters detected
        if (hindiMatches > 0 || /[^\u0000-\u007F]+/.test(msg)) {
            this.session.language = 'hindi';
        } else {
            this.session.language = 'english';
        }
    }

    detectIntent(msg) {
        // Priority 1: Complaint (Hindi + English)
        if (this.matchAny(msg, ['damage', 'refund', 'complaint', 'bad', 'legal', 'kharab', 'galat', 'shikayat', 'wapas'])) return 'COMPLAINT';

        // Priority 2: Sales Funnel (Health)
        if (this.matchAny(msg, ['pain', 'immunity', 'energy', 'digest', 'health', 'sick', 'weak', 'price', 'buy', 'cost', 'dard', 'ghutna', 'joron', 'pet', 'kamzori', 'pachan', 'acidity'])) return 'SALES';

        // Priority 3: RCA Info
        if (this.matchAny(msg, ['product', 'offer', 'list', 'about', 'who', 'rca', 'contact', 'phone', 'email'])) {
            if (this.matchAny(msg, ['product', 'offer', 'list'])) return 'PRODUCT_LIST';
            if (this.matchAny(msg, ['about', 'who', 'rca'])) return 'ABOUT';
            return 'CONTACT';
        }

        // Priority 4: Business Funnel
        if (this.session.leadCooldown === 0) {
            if (this.matchAny(msg, ['join', 'business', 'partnership', 'distributor', 'income', 'earn', 'distribution', 'judna', 'business karna', 'paisa kamana'])) return 'BUSINESS_FLOW';
        }

        // Priority 5: Greetings
        if (this.matchAny(msg, ['hello', 'hi', 'hey', 'greetings', 'namaste'])) return 'GREETING';

        // Priority 6: AI Fallback (Complexity or Advanced Keywords)
        const guardrail = this.checkGuardrails(msg);
        if (this.llmConfig.enabled && guardrail.triggerLLM) return 'AI_FALLBACK';

        return 'UNKNOWN';
    }

    getTransitionPhrase(key) {
        const dict = {
            welcome: { english: "Hello! I'm your RCA Smart Business Assistant. Would you like to explore products, join our mission, or do you have a specific health concern?", hindi: "Namaste! Main RCA Wellness Smart Assistant hoon. Kya aap products dekhna chahte hain, hamare saath judna chahte hain, ya koi bimari ki jankari chahiye?" },
            complaint_intro: { english: "I'm sorry there's an issue. Please provide your Order ID.", hindi: "Humein khed hai. Kripya apna Order ID dein." },
            sales_intro: { english: "I'll help you find the right Ayurvedic solution. To start, what is your age?", hindi: "Main aapki madad karunga. Shuruat ke liye, aapki umar kya hai?" },
            contact_info: { english: `Reach us at ${this.knowledgeBase.contact.phone} or ${this.knowledgeBase.contact.email}.`, hindi: `Humein ${this.knowledgeBase.contact.phone} par call karein ya ${this.knowledgeBase.contact.email} par mail karein.` },
            restart_sales: { english: "I'm sorry. Let's start over. What is your age?", hindi: "Maaf kijiye. Chaliye fir se shuru karte hain. Aapki umar kya hai?" },
            generic_affirmation: { english: "I understand! Tell me more or ask about our Ayurvedic products.", hindi: "Main samajh gaya! Kripya aur batayein ya hamare products ke baare mein puchein." },
            fallback: { english: "I'm here to support your journey with RCA Wellness. Would you like to see products, join as a partner, or report an issue?", hindi: "Main RCA Wellness mein aapki madad ke liye hoon. Kya aap products dekhna chahte hain, partner banna chahte hain, ya koi shikayat hai?" }
        };
        return dict[key][this.session.language];
    }

    // --- State Handlers ---

    handleStateFlow(msg) {
        // Global Objection Handling (Intercept before state-specific logic)
        const objection = this.checkObjections(msg);
        if (objection) return objection;

        switch (this.session.state) {
            case ChatStates.BUSINESS_FLOW: return this.handleBusinessFlow(msg);
            case ChatStates.COMPLAINT_LOGGING: return this.handleComplaintFlow(msg);
            case ChatStates.SALES_FUNNEL: return this.handleSalesFlow(msg);
            default: this.resetSession(); return "I lost track. Please restart. / Main bhool gaya, kripya fir se kahein.";
        }
    }

    handleBusinessFlow(msg) {
        const step = this.session.data.step;
        const lang = this.session.language;

        switch (step) {
            case 1: // Pattern Interrupt
                this.session.data.step = 2;
                return lang === 'hindi' ? "Isse pehle ki main aage badhun, ek cheez batayein. Agar aapki aaj ki income ruk jaye, toh aap kitne samay tak aaram se reh payenge?" : "Let me ask you something before I explain anything. If your current income stopped today, how long could you sustain comfortably?";

            case 2: // Controlled Curiosity
                this.session.data.step = 3;
                return lang === 'hindi' ? "Do tarah ke log hote hain jo is model ko dekhte hain. Pehle woh jo turant paisa chahte hain, aur dusre woh jo long-term leverage chahte hain. Aap kis category mein aate hain?" : "There are two types of people who look at structured distribution models. Those who want quick money, and those who want long-term leverage. Which category do you relate to?";

            case 3: // Qualification Filter
                this.session.data.step = 4;
                return lang === 'hindi' ? "Main ye har kisi ko explain nahi karta. Ye sirf unke liye hai jo communicate kar sakte hain, bada sochte hain aur system follow karte hain. Kya aap aise hain?" : "I don't explain this opportunity to everyone. It works only for people who can communicate, think long term, and follow systems. Does that describe you?";

            case 4: // Identity & Logical Framing (Industry)
                this.session.data.step = 5;
                const identity = lang === 'hindi' ? "Aapki baaton se lagta hai ki aap average nahi hain. Aap comfort se zyada growth ko pasand karte hain. " : "From your answers, you don't sound average. You seem like someone who prefers growth over comfort. ";
                const logic = lang === 'hindi' ? "Dekhiye, wellness industry bahut tezi se badh rahi hai kyunki lifestyle bimariyan badh rahi hain aur log Ayurveda par bharosa kar rahe hain. RCA Wellness ek repeat-consumption model par kaam karta hai, na ki one-time sales par." : "Let's talk logically. The wellness industry is expanding rapidly because lifestyle diseases are increasing and Ayurvedic trust is growing. RCA Wellness operates in a repeat-consumption model, not one-time sales.";
                return identity + logic;

            case 5: // Model & Reverse Psychology
                this.session.data.step = 6;
                return lang === 'hindi' ? "Ye koi job nahi hai balki ek structured distribution model hai. Main sach kahun toh ye sabke liye nahi hai. Ismein patience aur follow-up ki zarurat hoti hai. Agar koi bina mehnat ke paisa chahta hai, toh ye unke liye nahi hai." : "This is not a job. This is a structured distribution model. I'll be honest, this opportunity is NOT for everyone. It requires patience and follow-up. If someone wants quick money without effort, this won't work.";

            case 6: // Future Projection
                this.session.data.step = 7;
                return lang === 'hindi' ? "Sochiye, agar aap 12-18 mahino mein 50-100 customers ka network bana lete hain aur log reorder karte hain, toh aapki income har mahine zero se shuru nahi hogi. Kya ye structure aapke goals se match karta hai?" : "Imagine building a 50-100 customer network over 12-18 months. Every reorder generates structured income. In that scenario, your income doesn't restart at zero every month. Does that kind of structure align with your long-term goals?";

            case 7: // Soft Close
                this.session.data.step = 8;
                return lang === 'hindi' ? "Agar aap ise professionally samajhna chahte hain, toh main aapko mentor se connect kar sakta hoon. Kya aap aage badhna chahenge?" : "If you're serious about exploring this professionally, I can connect you with the regional mentor for a detailed breakdown. Would you like to proceed?";

            case 8: // Lead Capture - Name
                if (msg.toLowerCase().includes("no") || msg.toLowerCase().includes("nahi")) {
                    this.resetSession();
                    return lang === 'hindi' ? "Theek hai. Jab aap tayyar hon tab batayein." : "I understand. Let me know when you are ready to explore further.";
                }
                this.session.data.step = 9;
                return lang === 'hindi' ? "Bahut badhiya. Kripya apna purna naam batayein." : "Great. What is your Full Name?";

            case 9: // Lead Capture - City
                this.session.data.name = msg;
                this.session.data.step = 10;
                return lang === 'hindi' ? "Aap kaunse shehar (City) se hain?" : "What City are you from?";

            case 10: // Lead Capture - Phone
                this.session.data.city = msg;
                this.session.data.step = 11;
                return lang === 'hindi' ? "Apna Phone Number batayein takki main aage ki jankari share kar sakun." : "Please share your Phone Number so I can share further details.";

            case 11: // Close
                if (!/^\d{10}$/.test(msg.replace(/\D/g, ''))) return lang === 'hindi' ? "Invalid number. 10 digits chahiye." : "Invalid number. Need 10 digits.";
                this.session.data.phone = msg;
                this.apiSubmit('BUSINESS_LEAD', this.session.data);
                this.session.leadCooldown = 5;
                this.resetSession();
                return lang === 'hindi' ? "Dhanyavad! Hamari team aapse jald sampark karegi." : "Thank you! Our team will contact you shortly.";

            default:
                this.resetSession();
                return lang === 'hindi' ? "Chaliye fir se shuru karte hain." : "Let's start over.";
        }
    }

    checkObjections(msg) {
        const lower = msg.toLowerCase();
        const lang = this.session.language;

        if (lower.includes("mlm") || lower.includes("pyramid") || lower.includes("scheme")) {
            return lang === 'hindi' ? "Ye ek direct selling structure hai. Income asli product movement par depend karti hai, sirf logon ko jodne par nahi. No product = No income." : "It follows a direct selling structure. Income depends on real product movement, not just recruitment. No product = No income.";
        }
        if (lower.includes("risk") || lower.includes("dhokha") || lower.includes("loss")) {
            return lang === 'hindi' ? "Main risk hai aapka samay. Financial entry traditional business ke muqable bahut kam hai." : "The main risk is your time investment. Financial entry is very low compared to starting a traditional business.";
        }
        if (lower.includes("income") || lower.includes("paisa kitna") || lower.includes("salary")) {
            return lang === 'hindi' ? "Income aapki mehnat, network aur consistency par depend karti hai. Ismein koi fixed guarantee nahi hai, lekin scale karne ki kshamta bahut hai." : "Income varies based on effort, network size, and consistency. There is no fixed guarantee, but the potential to scale is significant.";
        }
        return null;
    }

    handleComplaintFlow(msg) {
        const step = this.session.data.step;
        if (step === 1) {
            this.session.data.orderId = msg;
            this.session.data.step = 2;
            return this.session.language === 'hindi' ? "Humein apni dikkat (issue) batayein." : "Describe the issue you're facing.";
        } else {
            this.session.data.issue = msg;
            this.apiSubmit('COMPLAINT', this.session.data);
            this.resetSession();
            return this.session.language === 'hindi' ? "Logged! 24-48 ghanto mein hal ho jayega." : "Logged! We'll resolve it in 24-48 hours.";
        }
    }

    handleSalesFlow(msg) {
        const step = this.session.data.step;
        if (step === 1) {
            this.session.data.age = msg;
            const recs = this.getSmartRecommendations(this.session.data.query);
            this.resetSession();

            if (recs.length === 0) return this.getProductListResponse();

            let resp = this.session.language === 'hindi' ? "Aapke liye ye suggestions hain: " : "Here are the top suggestions for you: ";
            recs.forEach(r => {
                resp += `${r.product.name} - ${r.product.benefits[this.session.language]}. ${r.product.testimonial[this.session.language]}. `;
            });
            if (this.businessMode && recs.length > 1) {
                resp += this.session.language === 'hindi' ? "Combo offer: Dono par 10% ki chhoot!" : "Combo Offer: Get 10% special discount on both!";
            }
            return resp.trim();
        }
    }

    // --- Helpers ---

    getSmartRecommendations(query) {
        return this.knowledgeBase.products.map(p => {
            let score = 0;
            p.tags.forEach(t => { if (query.includes(t)) score += 25; });
            return { product: p, score: Math.min(score, 100) };
        }).filter(m => m.score > 0).sort((a, b) => b.score - a.score).slice(0, 2);
    }

    getProductListResponse() {
        const list = this.knowledgeBase.products.map(p => `${p.name} - ${p.benefits[this.session.language]}`).join('. ');
        return (this.session.language === 'hindi' ? "Hamare Ayurvedic products ki list: " : "Our Ayurvedic range: ") + list + ".";
    }

    matchAny(msg, keywords) { return keywords.some(k => msg.includes(k)); }
    checkPriority(msg) { return this.matchAny(msg, ['urgent', 'legal', 'turant']) ? 'HIGH' : 'NORMAL'; }
    sanitizeHTML(str) { const temp = document.createElement('div'); temp.textContent = str; return temp.innerHTML; }
    apiSubmit(t, d) { console.log(`[API] ${t}`, d); }
    resetSession() { this.session.state = ChatStates.IDLE; this.session.data = {}; }

    resetReminder() {
        if (this.reminderTimer) clearTimeout(this.reminderTimer);
        this.reminderTimer = setTimeout(() => {
            if (this.session.state === ChatStates.IDLE && this.messages.length > 0) {
                this.addMessage(this.getTransitionPhrase('fallback'), 'bot');
            }
        }, this.inactivityTimeout);
    }

    // --- Mobile Layout Fixes ---

    initMobileHandling() {
        // Prevent background scrolling on mobile
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

            // Log for debugging if needed (can be removed later)
            // console.log(`Viewport height: ${viewport.height}, innerHeight: ${window.innerHeight}`);

            if (window.innerWidth <= 768) {
                // Adjust wrapper height to match visual viewport
                // This prevents the header from being pushed off-screen
                appWrapper.style.height = `${viewport.height}px`;

                // Ensure we are at the top of the actual page
                window.scrollTo(0, 0);

                // Scroll to the latest message
                this.scrollToBottom();
            } else {
                appWrapper.style.height = '';
            }
        };

        window.visualViewport.addEventListener('resize', handleResize);
        window.visualViewport.addEventListener('scroll', handleResize);

        // Also handle focus/blur as backup
        this.messageInput.addEventListener('focus', () => {
            setTimeout(handleResize, 300);
        });

        this.messageInput.addEventListener('blur', () => {
            setTimeout(handleResize, 100);
        });
    }

    // --- UI Logic ---

    handleKeyPress(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendMessage(); } }
    handleInputChange() { this.autoResizeTextarea(); this.sendBtn.disabled = !this.messageInput.value.trim(); }
    autoResizeTextarea() { this.messageInput.style.height = 'auto'; this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px'; }
    showTypingIndicator() { this.typingIndicator.classList.add('active'); this.scrollToBottom(); }
    hideTypingIndicator() { this.typingIndicator.classList.remove('active'); }
    scrollToBottom() { this.chatMessages.scrollTop = this.chatMessages.scrollHeight; }

    addMessage(content, sender) {
        const message = { id: Date.now(), content, sender, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
        this.messages.push(message);
        this.renderMessage(message);
        this.saveChatHistory();
        this.scrollToBottom();
    }

    renderMessage(message) {
        const div = document.createElement('div');
        div.className = `message ${message.sender}`;
        div.innerHTML = `
            <div class="message-avatar"><i class="fas fa-${message.sender === 'user' ? 'user' : 'robot'}"></i></div>
            <div class="message-content">
                <p>${message.content}</p>
                <div class="message-time">${message.timestamp}</div>
            </div>
        `;
        this.chatMessages.appendChild(div);
    }

    clearChat() { if (confirm('Clear?')) { this.messages = []; this.renderWelcome(); this.saveChatHistory(); } }
    renderWelcome() { this.chatMessages.innerHTML = `<div class="welcome-message"><div class="bot-avatar"><i class="fas fa-robot"></i></div><div class="message-content"><p>${this.getTransitionPhrase('welcome')}</p></div></div>`; }
    toggleTheme() { const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', t); localStorage.setItem('theme', t); }
    loadTheme() { const t = localStorage.getItem('theme') || 'light'; document.documentElement.setAttribute('data-theme', t); }
    saveChatHistory() { localStorage.setItem('chatHistory', JSON.stringify(this.messages)); }
    loadChatHistory() {
        const h = localStorage.getItem('chatHistory');
        if (h) { this.messages = JSON.parse(h); if (this.messages.length === 0) this.renderWelcome(); else { this.chatMessages.innerHTML = ''; this.messages.forEach(m => this.renderMessage(m)); } this.scrollToBottom(); }
        else this.renderWelcome();
    }

    handleAttachment() {
        const input = document.createElement('input'); input.type = 'file';
        input.onchange = (e) => { const f = e.target.files[0]; if (f) this.addMessage(`📎 Attachment: ${f.name}`, 'user'); };
        input.click();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ChatBot();
    // Pre-load voices
    window.speechSynthesis.getVoices();
});
