class SpeechAssistant {
    constructor() {
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.isPlaying = false;
        // Storage keys
        this.STORAGE_KEYS = {
            BAB1: 'speech_assistant_bab1',
            BAB2: 'speech_assistant_bab2',
            BAB3: 'speech_assistant_bab3',
            QUESTIONS: 'speech_assistant_questions',
            TIMESTAMP: 'speech_assistant_timestamp'
        };
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateStorageStatus();
        this.loadSavedData();
    }

    bindEvents() {
        document.getElementById('generateBtn').addEventListener('click', () => this.generateQuestions());
        document.getElementById('playAllBtn').addEventListener('click', () => this.playAllQuestions());
        document.getElementById('stopBtn').addEventListener('click', () => this.stopSpeech());
        document.getElementById('submitAnswerBtn').addEventListener('click', () => this.submitAnswer());
        document.getElementById('nextQuestionBtn').addEventListener('click', () => this.nextQuestion());
        document.getElementById('loadDataBtn').addEventListener('click', () => this.loadSavedData());
        document.getElementById('clearDataBtn').addEventListener('click', () => this.clearAllData());

        // Auto save saat user mengetik dengan debounce
        ['bab1Input', 'bab2Input', 'bab3Input'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => {
                clearTimeout(this.saveTimeout);
                this.saveTimeout = setTimeout(() => this.autoSave(), 500); // Delay 500ms
            });
        });
    }

    // Fungsi untuk parsing simbol-simbol dari Gemini
    parseGeminiText(text) {
        if (!text) return text;
        
        return text
            // Hapus simbol markdown dan formatting
            .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold markdown **text**
            .replace(/\*([^*]+)\*/g, '$1')     // Italic markdown *text*
            .replace(/#{1,6}\s*/g, '')         // Header markdown # text
            .replace(/```[^`]*```/g, '')       // Code blocks
            .replace(/`([^`]+)`/g, '$1')       // Inline code
            .replace(/^\s*[-*+]\s*/gm, '')     // List bullets
            .replace(/[#@$%^&*()_+=\[\]{}|\\:";'<>?,./~`]/gi, '') // Simbol khusus (kecuali nomor dan tanda tanya)
            .replace(/\s+/g, ' ')              // Multiple spaces jadi single space
            .trim();
    }

    // Storage functions - MENGGUNAKAN localStorage ASLI
    setStorage(key, value) {
        try {
            if (typeof Storage !== "undefined") {
                localStorage.setItem(key, JSON.stringify(value));
                console.log(`Data berhasil disimpan ke localStorage: ${key}`);
                return true;
            } else {
                console.error('localStorage tidak didukung oleh browser ini');
                return false;
            }
        } catch (error) {
            console.error('Error menyimpan data ke localStorage:', error);
            return false;
        }
    }

    getStorage(key) {
        try {
            if (typeof Storage !== "undefined") {
                const item = localStorage.getItem(key);
                const result = item ? JSON.parse(item) : null;
                console.log(`Data diambil dari localStorage: ${key}`, result);
                return result;
            } else {
                console.error('localStorage tidak didukung oleh browser ini');
                return null;
            }
        } catch (error) {
            console.error('Error mengambil data dari localStorage:', error);
            return null;
        }
    }

    removeStorage(key) {
        try {
            if (typeof Storage !== "undefined") {
                localStorage.removeItem(key);
                console.log(`Data dihapus dari localStorage: ${key}`);
                return true;
            } else {
                console.error('localStorage tidak didukung oleh browser ini');
                return false;
            }
        } catch (error) {
            console.error('Error menghapus data dari localStorage:', error);
            return false;
        }
    }

    autoSave() {
        const bab1 = document.getElementById('bab1Input').value.trim();
        const bab2 = document.getElementById('bab2Input').value.trim();
        const bab3 = document.getElementById('bab3Input').value.trim();

        // Simpan setiap bab jika ada isinya
        if (bab1) this.setStorage(this.STORAGE_KEYS.BAB1, bab1);
        if (bab2) this.setStorage(this.STORAGE_KEYS.BAB2, bab2);
        if (bab3) this.setStorage(this.STORAGE_KEYS.BAB3, bab3);
        
        // Update timestamp
        this.setStorage(this.STORAGE_KEYS.TIMESTAMP, new Date().toISOString());
        
        this.updateStorageStatus();
        console.log('Auto save completed');
    }

    loadSavedData() {
        console.log('Loading saved data...');
        
        const bab1 = this.getStorage(this.STORAGE_KEYS.BAB1);
        const bab2 = this.getStorage(this.STORAGE_KEYS.BAB2);
        const bab3 = this.getStorage(this.STORAGE_KEYS.BAB3);
        const questions = this.getStorage(this.STORAGE_KEYS.QUESTIONS);

        // Load data ke form inputs
        if (bab1) {
            document.getElementById('bab1Input').value = bab1;
            console.log('Bab 1 loaded:', bab1.substring(0, 50) + '...');
        }
        if (bab2) {
            document.getElementById('bab2Input').value = bab2;
            console.log('Bab 2 loaded:', bab2.substring(0, 50) + '...');
        }
        if (bab3) {
            document.getElementById('bab3Input').value = bab3;
            console.log('Bab 3 loaded:', bab3.substring(0, 50) + '...');
        }

        // Load questions jika ada
        if (questions && questions.length > 0) {
            this.questions = questions;
            this.showQuestions();
            document.getElementById('questionsSection').classList.remove('hidden');
            console.log('Questions loaded:', questions.length + ' pertanyaan');
        }

        this.updateStorageStatus();
        
        // Show notification jika ada data yang dimuat
        if (bab1 || bab2 || bab3 || questions) {
            this.showNotification('Data berhasil dimuat dari penyimpanan local browser!', 'success');
        }
    }

    clearAllData() {
        if (confirm('Apakah Anda yakin ingin menghapus semua data tersimpan? Tindakan ini tidak dapat dibatalkan.')) {
            // Hapus semua data dari localStorage
            Object.values(this.STORAGE_KEYS).forEach(key => {
                this.removeStorage(key);
            });

            // Reset form
            document.getElementById('bab1Input').value = '';
            document.getElementById('bab2Input').value = '';
            document.getElementById('bab3Input').value = '';
            
            // Reset questions
            this.questions = [];
            document.getElementById('questionsSection').classList.add('hidden');
            document.getElementById('answerSection').classList.add('hidden');
            document.getElementById('progressSection').classList.add('hidden');

            this.updateStorageStatus();
            this.showNotification('Semua data berhasil dihapus dari penyimpanan!', 'info');
            console.log('All data cleared from localStorage');
        }
    }

    updateStorageStatus() {
        const bab1 = this.getStorage(this.STORAGE_KEYS.BAB1);
        const bab2 = this.getStorage(this.STORAGE_KEYS.BAB2);
        const bab3 = this.getStorage(this.STORAGE_KEYS.BAB3);
        const questions = this.getStorage(this.STORAGE_KEYS.QUESTIONS);
        const timestamp = this.getStorage(this.STORAGE_KEYS.TIMESTAMP);

        const statusEl = document.getElementById('storageStatus');
        
        if (!bab1 && !bab2 && !bab3 && !questions) {
            statusEl.textContent = 'Status: Belum ada data tersimpan';
            statusEl.className = 'mt-3 text-sm text-gray-600';
        } else {
            const savedItems = [];
            if (bab1) savedItems.push('Bab 1');
            if (bab2) savedItems.push('Bab 2');
            if (bab3) savedItems.push('Bab 3');
            if (questions) savedItems.push(`${questions.length} Pertanyaan`);
            
            const timeStr = timestamp ? new Date(timestamp).toLocaleString('id-ID') : 'Tidak diketahui';
            statusEl.innerHTML = `Status: <span class="text-green-600 font-semibold">Tersimpan di Browser</span> - ${savedItems.join(', ')} | Terakhir disimpan: ${timeStr}`;
            statusEl.className = 'mt-3 text-sm text-gray-600';
        }
    }

    showNotification(message, type = 'info') {
        const colors = {
            success: 'bg-green-100 border-green-400 text-green-700',
            error: 'bg-red-100 border-red-400 text-red-700',
            info: 'bg-blue-100 border-blue-400 text-blue-700'
        };

        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 border-l-4 rounded-lg z-50 ${colors[type]} animate-pulse`;
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-info-circle mr-2"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    async generateQuestions() {
        const bab1 = document.getElementById('bab1Input').value.trim();
        const bab2 = document.getElementById('bab2Input').value.trim();
        const bab3 = document.getElementById('bab3Input').value.trim();

        if (!bab1 || !bab2 || !bab3) {
            alert('Harap isi semua bab proposal (Bab 1, Bab 2, dan Bab 3) terlebih dahulu!');
            return;
        }

        // HAPUS PERTANYAAN LAMA DARI LOCALSTORAGE SEBELUM GENERATE YANG BARU
        this.removeStorage(this.STORAGE_KEYS.QUESTIONS);
        console.log('Pertanyaan lama dihapus dari localStorage');
        
        // Reset questions array dan UI
        this.questions = [];
        document.getElementById('questionsSection').classList.add('hidden');
        document.getElementById('answerSection').classList.add('hidden');
        document.getElementById('progressSection').classList.add('hidden');

        // SIMPAN OTOMATIS BAB 1-3 SEBELUM GENERATE QUESTIONS
        this.autoSave();

        this.showLoading(true);

        try {
            const response = await fetch('/api/generate-questions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ bab1, bab2, bab3 })
            });

            const data = await response.json();

            if (data.success) {
                // Langsung proses tanpa cleaning berlebihan
                this.processQuestions(data.questions);
                this.showQuestions();
                
                // Simpan pertanyaan ke localStorage
                this.setStorage(this.STORAGE_KEYS.QUESTIONS, this.questions);
                this.setStorage(this.STORAGE_KEYS.TIMESTAMP, new Date().toISOString());
                this.updateStorageStatus();
                
                this.showNotification('Pertanyaan berhasil dihasilkan dan disimpan!', 'success');
            } else {
                throw new Error(data.error || 'Gagal menghasilkan pertanyaan');
            }

        } catch (error) {
            console.error('Error:', error);
            alert('Terjadi kesalahan: ' + error.message);
            this.showNotification('Gagal menghasilkan pertanyaan!', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // FUNGSI PARSING YANG DIPERBAIKI
    processQuestions(questionsText) {
        console.log('Raw questions text dari Gemini:', questionsText);
        
        this.questions = [];
        
        // Method 1: Split berdasarkan nomor urut yang jelas (1. 2. 3. dst)
        const numberedPattern = /(\d+\.\s*[^0-9]+?)(?=\d+\.\s*|$)/g;
        let matches = questionsText.match(numberedPattern);
        
        if (matches && matches.length > 0) {
            console.log('Menggunakan pattern numbered list');
            matches.forEach((match, index) => {
                const cleanQuestion = this.cleanQuestion(match);
                if (cleanQuestion) {
                    this.questions.push(cleanQuestion);
                    console.log(`Pertanyaan ${index + 1}:`, cleanQuestion);
                }
            });
        } else {
            // Method 2: Split berdasarkan baris baru dan filter yang mengandung kata tanya
            console.log('Menggunakan pattern line-by-line');
            const lines = questionsText.split(/\n+/);
            
            lines.forEach((line, index) => {
                const trimmed = line.trim();
                
                // Skip baris kosong atau terlalu pendek
                if (!trimmed || trimmed.length < 20) return;
                
                // Cek apakah mengandung kata tanya Indonesia
                const questionWords = [
                    'apa', 'mengapa', 'bagaimana', 'kapan', 'dimana', 'siapa',
                    'jelaskan', 'sebutkan', 'uraikan', 'analisis', 'bandingkan',
                    'evaluasi', 'apakah', 'bisakah', 'dapatkah', 'sejauh mana'
                ];
                
                const hasQuestionWord = questionWords.some(word => 
                    trimmed.toLowerCase().includes(word.toLowerCase())
                );
                
                // Atau mengandung tanda tanya
                const hasQuestionMark = trimmed.includes('?');
                
                if (hasQuestionWord || hasQuestionMark) {
                    const cleanQuestion = this.cleanQuestion(trimmed);
                    if (cleanQuestion && cleanQuestion.length > 15) {
                        this.questions.push(cleanQuestion);
                        console.log(`Pertanyaan dari line ${index}:`, cleanQuestion);
                    }
                }
            });
        }
        
        // Method 3: Fallback - jika masih kosong, coba split berdasarkan tanda tanya
        if (this.questions.length === 0) {
            console.log('Menggunakan fallback pattern - split by question marks');
            const questionParts = questionsText.split('?');
            questionParts.forEach((part, index) => {
                const trimmed = part.trim();
                if (trimmed && trimmed.length > 20) {
                    const cleanQuestion = this.cleanQuestion(trimmed + '?');
                    if (cleanQuestion) {
                        this.questions.push(cleanQuestion);
                        console.log(`Fallback pertanyaan ${index + 1}:`, cleanQuestion);
                    }
                }
            });
        }
        
        // Hapus duplikat dan filter pertanyaan yang valid
        this.questions = [...new Set(this.questions)].filter(q => 
            q && q.length > 15 && q.length < 500
        );
        
        console.log(`Berhasil memproses ${this.questions.length} pertanyaan:`, this.questions);
        
        // Jika masih tidak ada hasil, buat pertanyaan default
        if (this.questions.length === 0) {
            this.questions = [
                'Apa latar belakang masalah yang mendorong penelitian ini?',
                'Bagaimana metodologi penelitian yang akan Anda gunakan?',
                'Apa kontribusi dan kebaruan dari penelitian ini?',
                'Bagaimana Anda mengatasi keterbatasan penelitian?',
                'Sejauh mana relevansi teori yang Anda gunakan?'
            ];
            console.log('Menggunakan pertanyaan default karena parsing gagal');
        }
    }

    // Fungsi untuk membersihkan dan memformat pertanyaan
    cleanQuestion(questionText) {
        if (!questionText) return null;
        
        let cleaned = questionText
            // Hapus nomor urut di awal (1. 2. 3. dst)
            .replace(/^\d+\.\s*/, '')
            // Hapus bullet points
            .replace(/^[-•*]\s*/, '')
            // Hapus markdown formatting
            .replace(/\*\*([^*]+)\*\*/g, '$1')
            .replace(/\*([^*]+)\*/g, '$1')
            // Hapus simbol berlebihan tapi pertahankan tanda tanya
            .replace(/[#@$%^&*()_+=\[\]{}|\\:";'<>,./~`]/g, '')
            // Bersihkan whitespace
            .replace(/\s+/g, ' ')
            .trim();
        
        // Skip jika terlalu pendek atau tidak mengandung konten bermakna
        if (cleaned.length < 15) return null;
        
        // Pastikan diawali huruf kapital
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
        
        // Pastikan diakhiri tanda tanya
        if (!cleaned.endsWith('?')) {
            cleaned += '?';
        }
        
        return cleaned;
    }

    showQuestions() {
        const container = document.getElementById('questionsContainer');
        container.innerHTML = '';

        if (this.questions.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-question-circle text-4xl text-gray-400 mb-4"></i>
                    <p class="text-gray-600">Belum ada pertanyaan yang dihasilkan.</p>
                </div>
            `;
            return;
        }

        this.questions.forEach((question, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-6 mb-4';
            questionDiv.innerHTML = `
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <div class="flex items-center mb-3">
                            <div class="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full mr-3">
                                Pertanyaan ${index + 1}
                            </div>
                            <div class="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                                <i class="fas fa-clock mr-1"></i> Simulasi Ujian
                            </div>
                        </div>
                        <p class="text-gray-800 leading-relaxed text-lg font-medium mb-4">${question}</p>
                        <div class="flex items-center text-sm text-gray-500">
                            <i class="fas fa-lightbulb mr-2"></i>
                            <span>Siapkan jawaban yang logis dan didukung data</span>
                        </div>
                    </div>
                    <div class="flex flex-col space-y-2 ml-6">
                        <button onclick="speechAssistant.playQuestion(${index})" 
                                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center justify-center min-w-[80px]"
                                title="Putar Audio">
                            <i class="fas fa-play mr-2"></i>Putar
                        </button>
                        <button onclick="speechAssistant.answerQuestion(${index})" 
                                class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center justify-center min-w-[80px]"
                                title="Jawab Pertanyaan">
                            <i class="fas fa-reply mr-2"></i>Jawab
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(questionDiv);
        });

        // Tambahkan ringkasan di akhir
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mt-6';
        summaryDiv.innerHTML = `
            <div class="text-center">
                <i class="fas fa-chart-line text-3xl text-blue-600 mb-3"></i>
                <h3 class="text-lg font-bold text-gray-800 mb-2">Ringkasan Simulasi</h3>
                <p class="text-gray-600 mb-4">Total ${this.questions.length} pertanyaan siap untuk simulasi seminar proposal Anda</p>
                <div class="flex justify-center space-x-4">
                    <div class="bg-white rounded-lg px-4 py-2 shadow-sm">
                        <div class="text-sm text-gray-500">Total Pertanyaan</div>
                        <div class="text-xl font-bold text-blue-600">${this.questions.length}</div>
                    </div>
                    <div class="bg-white rounded-lg px-4 py-2 shadow-sm">
                        <div class="text-sm text-gray-500">Estimasi Waktu</div>
                        <div class="text-xl font-bold text-green-600">${this.questions.length * 5} menit</div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(summaryDiv);

        document.getElementById('questionsSection').classList.remove('hidden');
        this.showProgress();
    }

    playQuestion(index) {
        if (this.isPlaying) {
            responsiveVoice.cancel();
        }
        
        this.isPlaying = true;
        const question = this.questions[index];
        
        responsiveVoice.speak(question, "Indonesian Female", {
            rate: 1.2,
            pitch: 1,
            volume: 1,
            onend: () => {
                this.isPlaying = false;
            }
        });
    }

    playAllQuestions() {
        if (this.isPlaying) return;
        
        this.currentQuestionIndex = 0;
        this.playNextInSequence();
    }

    playNextInSequence() {
        if (this.currentQuestionIndex >= this.questions.length) {
            this.isPlaying = false;
            return;
        }

        this.isPlaying = true;
        const question = this.questions[this.currentQuestionIndex];
        
        // Tambahkan pengantar untuk setiap pertanyaan
        const introduction = `Pertanyaan ${this.currentQuestionIndex + 1}. ${question}`;
        
        responsiveVoice.speak(introduction, "Indonesian Female", {
            rate: 1.2,
            pitch: 1,
            volume: 1,
            onend: () => {
                this.currentQuestionIndex++;
                setTimeout(() => {
                    this.playNextInSequence();
                }, 1500); // Jeda 1.5 detik antar pertanyaan
            }
        });
    }

    stopSpeech() {
        responsiveVoice.cancel();
        this.isPlaying = false;
    }

    answerQuestion(index) {
        this.currentQuestionIndex = index;
        document.getElementById('currentQuestion').textContent = this.questions[index];
        document.getElementById('answerInput').value = '';
        document.getElementById('evaluationResult').classList.add('hidden');
        document.getElementById('answerSection').classList.remove('hidden');
        
        // Scroll ke section jawaban
        document.getElementById('answerSection').scrollIntoView({ behavior: 'smooth' });
    }

    async submitAnswer() {
        const answer = document.getElementById('answerInput').value.trim();
        const question = this.questions[this.currentQuestionIndex];

        if (!answer) {
            alert('Harap isi jawaban terlebih dahulu!');
            return;
        }

        try {
            const response = await fetch('/api/evaluate-answer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ question, answer })
            });

            const data = await response.json();

            if (data.success) {
                const cleanedEvaluation = this.parseGeminiText(data.evaluation);
                document.getElementById('evaluationText').textContent = cleanedEvaluation;
                document.getElementById('evaluationResult').classList.remove('hidden');
                
                // Update progress
                this.updateProgress();
                
                this.showNotification('Jawaban berhasil dievaluasi!', 'success');
            } else {
                throw new Error(data.error || 'Gagal mengevaluasi jawaban');
            }

        } catch (error) {
            console.error('Error:', error);
            alert('Terjadi kesalahan: ' + error.message);
            this.showNotification('Gagal mengevaluasi jawaban!', 'error');
        }
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.answerQuestion(this.currentQuestionIndex + 1);
        } else {
            alert('Selamat! Anda telah menyelesaikan semua pertanyaan simulasi seminar proposal.');
            document.getElementById('answerSection').classList.add('hidden');
            this.showNotification('Simulasi selesai! Terima kasih telah berlatih.', 'success');
        }
    }

    showProgress() {
        document.getElementById('progressSection').classList.remove('hidden');
        this.updateProgress();
    }

    updateProgress() {
        const answeredQuestions = document.querySelectorAll('#evaluationResult:not(.hidden)').length;
        const totalQuestions = this.questions.length;
        const percentage = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;
        
        document.getElementById('progressBar').style.width = percentage + '%';
        document.getElementById('progressText').textContent = 
            `${answeredQuestions} dari ${totalQuestions} pertanyaan selesai`;
    }

    showLoading(show) {
        const loadingSection = document.getElementById('loadingSection');
        if (show) {
            loadingSection.classList.remove('hidden');
        } else {
            loadingSection.classList.add('hidden');
        }
    }
}

// Initialize the application
const speechAssistant = new SpeechAssistant();

// Check ResponsiveVoice availability
window.addEventListener('load', () => {
    if (typeof responsiveVoice === 'undefined') {
        console.warn('ResponsiveVoice tidak tersedia. Text-to-speech mungkin tidak berfungsi.');
        speechAssistant.showNotification('Text-to-speech tidak tersedia. Fitur suara mungkin tidak berfungsi.', 'error');
    } else {
        console.log('ResponsiveVoice siap digunakan.');
    }
});

// Auto-save saat user menutup tab/browser
window.addEventListener('beforeunload', () => {
    speechAssistant.autoSave();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl+S untuk save manual
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        speechAssistant.autoSave();
        speechAssistant.showNotification('Data disimpan secara manual!', 'info');
    }
    
    // Ctrl+L untuk load data
    if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        speechAssistant.loadSavedData();
    }
    
    // Ctrl+Delete untuk clear data
    if (e.ctrlKey && e.key === 'Delete') {
        e.preventDefault();
        speechAssistant.clearAllData();
    }
});