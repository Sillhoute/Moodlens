export default function InfoPage() {
  return (
    <div className="space-y-8">
      {/* Header Halaman */}
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-gradient-brand">
          Arsitektur & Performansi Model FER
        </h1>
        <p className="text-sm text-muted-foreground">
          Analisis hasil eksperimen dan evaluasi 7 kelas emosi menggunakan
          Custom Residual CNN (Vanilla) dan Pre-trained ResNet50 (Transfer
          Learning) pada dataset FER-2013.
        </p>
      </div>

      {/* Grid Ringkasan Arsitektur Model */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Model 1: Vanilla */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">
              Custom Residual CNN
            </h2>
            <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-bold text-accent-2">
              Vanilla Model
            </span>
          </div>
          <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground">Konsep Desain:</strong>{" "}
              Dirancang khusus dari nol (from scratch) dengan mengadopsi prinsip
              ResNet (Residual Network) untuk mengatasi masalah vanishing
              gradient menggunakan Residual Blocks.
            </p>
            <p>
              <strong className="text-foreground">Cara Kerja & Fitur:</strong>{" "}
              Menggunakan skip connection ($y = f(x) + x$) dan projection
              shortcut $1 \times 1$ untuk penyesuaian dimensi. Sangat efisien
              dengan ~1.3 juta parameter, ukuran bobot kecil, serta komputasi
              cepat.
            </p>
            <p>
              <strong className="text-foreground">Akurasi Eksperimen:</strong>{" "}
              Mencapai akurasi pengujian <strong>51.3%</strong> (Macro F1:
              0.44), melampaui performa ResNet50 versi beku meskipun memiliki
              parameter yang jauh lebih sedikit.
            </p>
          </div>
          <div className="pt-2 border-t border-border/50 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Akurasi Pengujian (Test Set)
            </span>
            <span className="text-2xl font-black text-foreground">51%</span>
          </div>
        </div>

        {/* Model 2: ResNet50 */}
        <div className="rounded-2xl border border-primary/40 bg-card p-6 shadow-xl space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-1.5 w-full bg-gradient-brand" />
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">
              Pre-trained ResNet50
            </h2>
            <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-bold text-primary">
              Transfer Learning
            </span>
          </div>
          <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground">
                Pipeline GPU Internal:
              </strong>{" "}
              Otomatis mengonversi input grayscale ($48 \times 48 \times 1$)
              menjadi RGB ($48 \times 48 \times 3$), melakukan resizing ke $96
              \times 96$ piksel, dan normalisasi langsung di GPU.
            </p>
            <p>
              <strong className="text-foreground">
                Selective Fine-Tuning:
              </strong>{" "}
              Layer awal dibekukan karena sudah mahir mendeteksi fitur dasar.
              Hanya 30 layer teratas (top-30) yang dibuka untuk dilatih ulang
              agar sensitif terhadap mikro-ekspresi wajah.
            </p>
            <p>
              <strong className="text-foreground">Akurasi Eksperimen:</strong>{" "}
              Meningkat drastis dari versi beku (46.7%) menjadi{" "}
              <strong>61.7%</strong> (Macro F1: 0.60) setelah fine-tuning,
              menjadikannya model individu terbaik.
            </p>
          </div>
          <div className="pt-2 border-t border-border/50 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Akurasi Pengujian (Test Set)
            </span>
            <span className="text-2xl font-black text-gradient-brand">
              62% (+15%)
            </span>
          </div>
        </div>
      </div>

      {/* Tabel Evaluasi 7 Emosi Terpisah */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xl space-y-6">
        <div>
          <h3 className="text-base font-bold text-foreground">
            Evaluasi Detail Per Kelas Emosi (7.178 Gambar Uji)
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Metrik performa mendalam untuk setiap emosi berdasarkan
            Classification Report dan Confusion Matrix.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground uppercase font-semibold">
                <th className="py-3 px-4">Emosi</th>
                <th className="py-3 px-4">Vanilla (Prec / Rec / F1)</th>
                <th className="py-3 px-4">ResNet50 (Prec / Rec / F1)</th>
                <th className="py-3 px-4">Analisis Karakteristik Visual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {/* 1. Happy */}
              <tr>
                <td className="py-3 px-4 font-bold text-success">
                  1. Happy (Senang)
                </td>
                <td className="py-3 px-4">83% / 71% / 76%</td>
                <td className="py-3 px-4">85% / 78% / 81%</td>
                <td className="py-3 px-4 text-muted-foreground">
                  Performa tertinggi. Struktur senyuman lebar, pipi terangkat,
                  dan kerutan sudut mata sangat dominan dan mudah dikenali.
                </td>
              </tr>

              {/* 2. Surprise */}
              <tr>
                <td className="py-3 px-4 font-bold text-accent-2">
                  2. Surprise (Terkejut)
                </td>
                <td className="py-3 px-4">58% / 80% / 67%</td>
                <td className="py-3 px-4">70% / 81% / 75%</td>
                <td className="py-3 px-4 text-muted-foreground">
                  Sangat baik dengan recall tinggi (~80%). Bentuk geometri mata
                  melotot dan mulut terbuka berbentuk huruf O sangat khas.
                </td>
              </tr>

              {/* 3. Neutral */}
              <tr>
                <td className="py-3 px-4 font-bold text-foreground">
                  3. Neutral (Datar)
                </td>
                <td className="py-3 px-4">44% / 65% / 52%</td>
                <td className="py-3 px-4">52% / 69% / 59%</td>
                <td className="py-3 px-4 text-muted-foreground">
                  Sensitif mendeteksi wajah netral (recall tinggi), namun
                  presisi rendah karena sering tumpang tindih dengan wajah datar
                  saat sedih atau marah.
                </td>
              </tr>

              {/* 4. Angry */}
              <tr>
                <td className="py-3 px-4 font-bold text-destructive">
                  4. Angry (Marah)
                </td>
                <td className="py-3 px-4">46% / 28% / 35%</td>
                <td className="py-3 px-4">48% / 57% / 52%</td>
                <td className="py-3 px-4 text-muted-foreground">
                  Tantangan menengah. ResNet50 menunjukkan peningkatan recall
                  luar biasa karena berhasil mengekstrak fitur kerutan alis
                  tajam dengan baik.
                </td>
              </tr>

              {/* 5. Disgust */}
              <tr>
                <td className="py-3 px-4 font-bold text-warning">
                  5. Disgust (Jijik)
                </td>
                <td className="py-3 px-4">13% / 68% / 21%</td>
                <td className="py-3 px-4">53% / 65% / 58%</td>
                <td className="py-3 px-4 text-muted-foreground">
                  Masalah imbalance (hanya 111 sampel). Penggunaan class weights
                  berhasil memaksa sensitivitas tinggi, mendongkrak performa
                  ResNet50 secara signifikan.
                </td>
              </tr>

              {/* 6. Sad */}
              <tr>
                <td className="py-3 px-4 font-bold font-semibold text-sky-400">
                  6. Sad (Sedih)
                </td>
                <td className="py-3 px-4">42% / 42% / 42%</td>
                <td className="py-3 px-4">54% / 41% / 47%</td>
                <td className="py-3 px-4 text-muted-foreground">
                  Tantangan kasus tersulit. Cenderung salah diklasifikasikan
                  sebagai Netral atau Takut akibat kemiripan mikro-ekspresi
                  mulut dan mata sayu.
                </td>
              </tr>

              {/* 7. Fear */}
              <tr>
                <td className="py-3 px-4 font-bold text-rose-400">
                  7. Fear (Takut)
                </td>
                <td className="py-3 px-4">35% / 9% / 14%</td>
                <td className="py-3 px-4">53% / 40% / 45%</td>
                <td className="py-3 px-4 text-muted-foreground">
                  Emosi paling kompleks. Menggabungkan elemen terkejut dan
                  sedih. ResNet50 sukses mendongkrak recall dari 9% menjadi
                  40%.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
