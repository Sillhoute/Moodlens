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
              <strong className="text-foreground">Input:</strong> Citra
              Grayscale 48x48 piksel.
            </p>
            <p>
              <strong className="text-foreground">Fitur Utama:</strong>{" "}
              Menggunakan koneksi residual (skip connection) sederhana dengan
              filter konvolusi 3x3 (64, 128, 256 channel), Global Average
              Pooling, dan Dense Layer 256 unit.
            </p>
            <p>
              <strong className="text-foreground">Karakteristik:</strong>{" "}
              Ekstraksi pola lokal dasar (tepi, lipatan mulut) yang sangat
              ringan, efisien, dan cocok untuk inferensi cepat.
            </p>
          </div>
          <div className="pt-2 border-t border-border/50 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Akurasi Pengujian (Test Set)
            </span>
            <span className="text-2xl font-black text-foreground">56%</span>
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
              <strong className="text-foreground">Input:</strong> Resizing
              internal ke 96x96 piksel dengan 3 channel RGB.
            </p>
            <p>
              <strong className="text-foreground">Fitur Utama:</strong>{" "}
              Fine-tuning pada 30 layer teratas memanfaatkan bobot pra-latih
              ImageNet untuk mengenali struktur anatomi wajah yang rumit.
            </p>
            <p>
              <strong className="text-foreground">Karakteristik:</strong>{" "}
              Ekstraksi fitur visual tingkat tinggi yang mendalam untuk akurasi
              optimal.
            </p>
          </div>
          <div className="pt-2 border-t border-border/50 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Akurasi Pengujian (Test Set)
            </span>
            <span className="text-2xl font-black text-gradient-brand">
              61% (+5%)
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
                <td className="py-3 px-4">87% / 77% / 82%</td>
                <td className="py-3 px-4">85% / 78% / 81%</td>
                <td className="py-3 px-4 text-muted-foreground">
                  Performa tertinggi. Struktur senyuman lebar, pipi terangkat,
                  dan kerutan sudut mata sangat dominan dan mudah dikenali
                  filter konvolusi.
                </td>
              </tr>

              {/* 2. Surprise */}
              <tr>
                <td className="py-3 px-4 font-bold text-accent-2">
                  2. Surprise (Terkejut)
                </td>
                <td className="py-3 px-4">66% / 79% / 72%</td>
                <td className="py-3 px-4">69% / 80% / 74%</td>
                <td className="py-3 px-4 text-muted-foreground">
                  Sangat akurat dengan recall 80%. Bentuk geometri mata melotot
                  dan mulut terbuka membulat (berbentuk huruf O) sangat khas.
                </td>
              </tr>

              {/* 3. Neutral */}
              <tr>
                <td className="py-3 px-4 font-bold text-foreground">
                  3. Neutral (Datar)
                </td>
                <td className="py-3 px-4">47% / 70% / 56%</td>
                <td className="py-3 px-4">54% / 65% / 59%</td>
                <td className="py-3 px-4 text-muted-foreground">
                  Performa cukup konsisten. Minim tarikan otot ekstrem, namun
                  terkadang tumpang tindih dengan ekspresi Sedih atau Marah pada
                  wajah resting face.
                </td>
              </tr>

              {/* 4. Angry */}
              <tr>
                <td className="py-3 px-4 font-bold text-destructive">
                  4. Angry (Marah)
                </td>
                <td className="py-3 px-4">42% / 51% / 46%</td>
                <td className="py-3 px-4">50% / 57% / 53%</td>
                <td className="py-3 px-4 text-muted-foreground">
                  Performa moderat. Berfokus pada kerutan alis ke bawah, tetapi
                  sering tertukar dengan Sedih atau Netral karena intensitas
                  kerutan bervariasi.
                </td>
              </tr>

              {/* 5. Disgust */}
              <tr>
                <td className="py-3 px-4 font-bold text-warning">
                  5. Disgust (Jijik)
                </td>
                <td className="py-3 px-4">19% / 69% / 30%</td>
                <td className="py-3 px-4">45% / 68% / 54%</td>
                <td className="py-3 px-4 text-muted-foreground">
                  Sampel paling sedikit (111 sampel). Penggunaan class weight
                  berhasil mendongkrak presisi ResNet50 hingga 45% tanpa
                  mengorbankan sensitivitas.
                </td>
              </tr>

              {/* 6. Sad */}
              <tr>
                <td className="py-3 px-4 font-bold font-semibold text-sky-400">
                  6. Sad (Sedih)
                </td>
                <td className="py-3 px-4">44% / 31% / 36%</td>
                <td className="py-3 px-4">53% / 43% / 48%</td>
                <td className="py-3 px-4 text-muted-foreground">
                  Tantangan kasus sulit. Cenderung salah diklasifikasikan
                  sebagai Netral (277 gambar) atau Takut (140 gambar) akibat
                  kemiripan mikro ekspresi mulut.
                </td>
              </tr>

              {/* 7. Fear */}
              <tr>
                <td className="py-3 px-4 font-bold text-rose-400">
                  7. Fear (Takut)
                </td>
                <td className="py-3 px-4">41% / 21% / 28%</td>
                <td className="py-3 px-4">51% / 40% / 45%</td>
                <td className="py-3 px-4 text-muted-foreground">
                  Emosi paling kompleks. Memuat elemen mata membesar (mirip
                  Terkejut) dan mulut mengerut (mirip Sedih), namun ResNet50
                  sukses mendongkrak recall dari 21% ke 40%.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
