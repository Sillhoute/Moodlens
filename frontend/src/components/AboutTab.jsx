import { EMOTION_LABELS } from '../emotions.js';

// Angka dari laporan klasifikasi di notebook UTS Deep Learning (7.178 gambar folder test).
const CLASS_METRICS = [
  { emotion: 'happy', vanilla: [0.87, 0.77], resnet: [0.85, 0.78] },
  { emotion: 'surprise', vanilla: [0.66, 0.79], resnet: [0.69, 0.8] },
  { emotion: 'neutral', vanilla: [0.47, 0.7], resnet: [0.54, 0.65] },
  { emotion: 'angry', vanilla: [0.45, 0.51], resnet: [0.5, 0.57] },
  { emotion: 'sad', vanilla: [0.49, 0.31], resnet: [0.53, 0.43] },
  { emotion: 'fear', vanilla: [0.44, 0.21], resnet: [0.51, 0.4] },
  { emotion: 'disgust', vanilla: [0.19, 0.69], resnet: [0.45, 0.68] },
];

export default function AboutTab() {
  return (
    <div className="stack">
      <section className="card">
        <h3>Perbandingan model</h3>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Model</th>
                <th>Akurasi</th>
                <th>Parameter</th>
                <th>Dipakai untuk</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>ResNet50 (transfer learning)</td>
                <td>61%</td>
                <td>24,1 juta</td>
                <td>Foto</td>
              </tr>
              <tr>
                <td>Custom Residual CNN</td>
                <td>56%</td>
                <td>1,3 juta</td>
                <td>Kamera dan foto</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h3>Performa per ekspresi</h3>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Ekspresi</th>
                <th>Presisi CNN</th>
                <th>Recall CNN</th>
                <th>Presisi ResNet50</th>
                <th>Recall ResNet50</th>
              </tr>
            </thead>
            <tbody>
              {CLASS_METRICS.map(({ emotion, vanilla, resnet }) => (
                <tr key={emotion}>
                  <td>{EMOTION_LABELS[emotion]}</td>
                  <td>{vanilla[0].toFixed(2)}</td>
                  <td>{vanilla[1].toFixed(2)}</td>
                  <td>{resnet[0].toFixed(2)}</td>
                  <td>{resnet[1].toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h3>Cara kerja</h3>
        <ol>
          <li>OpenCV Haar Cascade mencari wajah pada gambar.</li>
          <li>Setiap wajah dipotong, diubah ke grayscale, dan diperkecil menjadi 48x48 piksel.</li>
          <li>Model menghitung skor untuk 7 ekspresi dari dataset FER.</li>
        </ol>
      </section>

      <section className="card">
        <h3>Keterbatasan</h3>
        <ul>
          <li>Sekitar 4 dari 10 prediksi pada data uji masih salah, jadi hasilnya tidak boleh dipakai untuk keputusan penting.</li>
          <li>Takut, sedih, dan jijik paling sulit dikenali. Senang dan terkejut paling andal.</li>
          <li>Skor adalah keluaran model, bukan tingkat kepastian. Skor bisa tinggi walaupun prediksinya salah.</li>
          <li>Model membaca ekspresi di wajah, bukan perasaan seseorang.</li>
          <li>Folder test juga dipakai saat memilih bobot terbaik, sehingga akurasi di atas cenderung optimistis.</li>
        </ul>
      </section>
    </div>
  );
}
