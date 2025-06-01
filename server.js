const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Route untuk generate pertanyaan dari Gemini
app.post('/api/generate-questions', async (req, res) => {
  try {
    const { bab1, bab2, bab3 } = req.body;
    
    if (!bab1 || !bab2 || !bab3) {
      return res.status(400).json({ error: 'Bab 1, Bab 2, dan Bab 3 harus diisi' });
    }
const prompt = `Berdasarkan proposal berikut:

BAB 1 - PENDAHULUAN:
${bab1}

BAB 2 - TINJAUAN PUSTAKA/LANDASAN TEORI:
${bab2}

BAB 3 - METODOLOGI:
${bab3}

🔍 **INSTRUKSI KHUSUS UNTUK ANDA (BERSIFAT WAJIB)**
Anda berperan sebagai **dosen penguji utama dalam seminar proposal skripsi**. Tugas Anda adalah mengajukan pertanyaan yang tajam, menusuk logika mahasiswa, dan menuntut argumen yang kuat dan akademis. Anda dikenal sebagai dosen perfeksionis, kritis, dan tidak segan membongkar kelemahan proposal secara langsung. Tunjukkan gaya tersebut dalam setiap pertanyaan.

🎯 **TUJUAN PERTANYAAN:**
- Menguji seberapa dalam mahasiswa memahami isi proposalnya sendiri.
- Mempertanyakan keabsahan dan relevansi latar belakang dan rumusan masalah.
- Mengkritik pilihan teori dan metodologi secara ketat.
- Menggali potensi bias, celah logika, dan kelemahan teknis-metodologis.
- Memastikan kontribusi ilmiah tidak hanya sekadar klaim belaka.

🧠 **GAYA BERTANYA YANG HARUS DIGUNAKAN:**
- Nada formal akademik, tajam, dan langsung ke inti permasalahan.
- Hindari pertanyaan basa-basi, buat seolah mahasiswa sedang "diadili secara ilmiah".
- Gunakan variasi kalimat tanya seperti:
  - “Di mana letak logika Anda saat menyusun…”
  - “Apa justifikasi ilmiah Anda ketika…”
  - “Jika pendekatan ini ternyata gagal, bagaimana Anda mempertanggungjawabkannya?”
  - “Sejauh mana Anda menyadari kelemahan teori yang Anda gunakan?”
  - “Apakah Anda benar-benar memahami implikasi dari…”
  - “Mengapa Anda tidak mempertimbangkan alternatif yang lebih relevan seperti…”
- Boleh mengandung pertanyaan hipotetik dan analogi yang menekan logika mahasiswa.

📝 **FORMAT WAJIB OUTPUT:**
1. Tulis dalam bentuk daftar bernomor (1. … 2. … 3. … dst).
2. Setiap nomor harus berupa **satu pertanyaan kritis, jelas, dan langsung menusuk substansi**.
3. Setiap pertanyaan **harus diakhiri tanda tanya (?)** dan **tidak boleh digabung dalam paragraf**.
4. Tidak ada narasi pembuka, penjelasan tambahan, atau paragraf deskriptif — hanya daftar pertanyaan.
5. Hindari pertanyaan umum yang dapat dijawab dengan jawaban normatif.

❌ **JANGAN LAKUKAN HAL BERIKUT:**
- Menggabungkan semua pertanyaan ke dalam satu paragraf panjang.
- Tidak menggunakan tanda baca yang tepat.
- Mengulang-ulang bentuk pertanyaan dengan kalimat yang hanya sedikit berbeda.
- Bertanya dengan nada sopan yang tidak mencerminkan evaluasi tajam.

✅ **OUTPUT YANG DIHARAPKAN (CONTOH):**
1. Apa validitas akademik dari pemilihan objek penelitian ini jika Anda tidak menyebutkan kriteria seleksi yang jelas?
2. Bagaimana Anda membedakan antara asumsi pribadi dan landasan teoretis dalam rumusan masalah yang Anda ajukan?
3. Jika metode ini ternyata tidak menghasilkan data yang sesuai, apa alternatif konkret yang telah Anda siapkan?
4. Apakah Anda menyadari bahwa teori X yang Anda gunakan sebenarnya telah dikritik habis dalam studi tahun 2020?
... dan seterusnya.
`;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Gagal menghasilkan pertanyaan');
    }

    const generatedText = data.candidates[0].content.parts[0].text;
    
    res.json({ 
      success: true, 
      questions: generatedText 
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan saat menghasilkan pertanyaan',
      details: error.message 
    });
  }
});

// Route untuk evaluate jawaban
app.post('/api/evaluate-answer', async (req, res) => {
  try {
    const { question, answer } = req.body;
    
    if (!question || !answer) {
      return res.status(400).json({ error: 'Pertanyaan dan jawaban harus diisi' });
    }

    const prompt = `Sebagai penguji seminar proposal, evaluasi jawaban berikut:

PERTANYAAN:
${question}

JAWABAN:
${answer}

Buat evaluasi singkat dalam 2–3 kalimat tanpa menulis ulang pertanyaan mencakup:
Penilaian terhadap kualitas jawaban (baik/cukup/kurang), disertai alasan singkat.
Apakah penjawab memahami isi proposalnya secara keseluruhan?
Saran atau masukan yang bisa membantu memperjelas dan memperkuat isi jawaban.
Hal-hal yang bisa dipertimbangkan ke depannya agar penelitian lebih matang.
Tambahkan kalimat penutup yang positif dan memotivasi, dengan bahasa yang hangat namun tetap akademis.

Gunakan bahasa yang jelas, sopan, tidak menghakimi, dan tetap menjaga nuansa akademik serta konstruktif.`; 

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Gagal mengevaluasi jawaban');
    }

    const evaluation = data.candidates[0].content.parts[0].text;
    
    res.json({ 
      success: true, 
      evaluation: evaluation 
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan saat mengevaluasi jawaban',
      details: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});