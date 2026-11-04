import multer from "multer";

export const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Berkas bukan gambar yang valid (gunakan JPG, PNG, atau WebP)",
        ),
      );
    }
  },
});
