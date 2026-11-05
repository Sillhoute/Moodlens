import sys
import json
import cv2
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, Model
from tensorflow.keras.applications import ResNet50

# Matikan log TF yang berisik
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

EMOTION_CLASSES = ["angry", "disgust", "fear", "happy", "sad", "surprise", "neutral"]
IMG_HEIGHT, IMG_WIDTH = 48, 48
NEW_IMG_SIZE = 96

# Definisi Kelas Arsitektur Sesuai Colab Kamu
class ResidualBlock(layers.Layer):
    def __init__(self, filters, stride=1, **kwargs):
        super(ResidualBlock, self).__init__(**kwargs)
        self.conv1 = layers.Conv2D(filters, (3, 3), strides=stride, padding='same', activation='relu')
        self.bn1 = layers.BatchNormalization()
        self.conv2 = layers.Conv2D(filters, (3, 3), strides=1, padding='same')
        self.bn2 = layers.BatchNormalization()
        self.shortcut = tf.keras.Sequential([layers.Conv2D(filters, (1, 1), strides=stride, padding='same'), layers.BatchNormalization()]) if stride != 1 else lambda x, training=False: x

    def call(self, inputs, training=False):
        shortcut = self.shortcut(inputs, training=training)
        x = self.conv1(inputs)
        x = self.bn1(x, training=training)
        x = self.conv2(x)
        x = self.bn2(x, training=training)
        return tf.nn.relu(layers.add([x, shortcut]))

class AdvancedResidualFERModel(Model):
    def __init__(self, num_classes=7, **kwargs):
        super(AdvancedResidualFERModel, self).__init__(**kwargs)
        self.init_conv = layers.Conv2D(64, (3, 3), padding='same', activation='relu')
        self.init_bn = layers.BatchNormalization()
        self.res_block1 = ResidualBlock(64, stride=1)
        self.pool1 = layers.MaxPooling2D(2, 2)
        self.drop1 = layers.Dropout(0.3)
        self.res_block2 = ResidualBlock(128, stride=2)
        self.pool2 = layers.MaxPooling2D(2, 2)
        self.drop2 = layers.Dropout(0.3)
        self.res_block3 = ResidualBlock(256, stride=2)
        self.gap = layers.GlobalAveragePooling2D()
        self.dense = layers.Dense(256, activation='relu')
        self.bn_dense = layers.BatchNormalization()
        self.drop_dense = layers.Dropout(0.5)
        self.out = layers.Dense(num_classes, activation='softmax')

    def call(self, inputs, training=False):
        x = self.init_conv(inputs)
        x = self.init_bn(x, training=training)
        x = self.res_block1(x, training=training)
        x = self.pool1(x)
        x = self.drop1(x, training=training)
        x = self.res_block2(x, training=training)
        x = self.pool2(x)
        x = self.drop2(x, training=training)
        x = self.res_block3(x, training=training)
        x = self.gap(x)
        x = self.dense(x)
        x = self.bn_dense(x, training=training)
        x = self.drop_dense(x, training=training)
        return self.out(x)

class OOPResNet50FERModel(Model):
    def __init__(self, num_classes=7, **kwargs):
        super(OOPResNet50FERModel, self).__init__(**kwargs)
        self.base_model = ResNet50(input_shape=(NEW_IMG_SIZE, NEW_IMG_SIZE, 3), include_top=False, weights=None)
        self.gap = layers.GlobalAveragePooling2D()
        self.dense = layers.Dense(256, activation='relu')
        self.bn = layers.BatchNormalization()
        self.dropout = layers.Dropout(0.5)
        self.out = layers.Dense(num_classes, activation='softmax')

    def call(self, inputs, training=False):
        x = tf.image.grayscale_to_rgb(inputs)
        x = tf.image.resize(x, (NEW_IMG_SIZE, NEW_IMG_SIZE))
        x = x * 255.0
        x = tf.keras.applications.resnet50.preprocess_input(x)
        x = self.base_model(x, training=training)
        x = self.gap(x)
        x = self.dense(x)
        x = self.bn(x, training=training)
        x = self.dropout(x, training=training)
        return self.out(x)

# Load Model Sekali di awal worker
base_dir = os.path.dirname(os.path.abspath(__file__))
vanilla_model = AdvancedResidualFERModel(num_classes=7)
vanilla_model(tf.zeros((1, IMG_HEIGHT, IMG_WIDTH, 1)))
vanilla_model.load_weights(os.path.join(base_dir, "model", "best_vanilla_fer_model.weights.h5"))

resnet_model = OOPResNet50FERModel(num_classes=7)
resnet_model(tf.zeros((1, IMG_HEIGHT, IMG_WIDTH, 1)))
resnet_model.load_weights(os.path.join(base_dir, "model", "best_resnet_fer.weights.h5"))

face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

def process_image(image_path):
    bgr = cv2.imread(image_path)
    if bgr is None:
        return {"error": "Gambar tidak valid"}

    h, w, _ = bgr.shape
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    faces_coords = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

    faces_result = []
    if len(faces_coords) == 0:
        faces_coords = [[0, 0, w, h]]

    for idx, (x, y, fw, fh) in enumerate(faces_coords):
        face_roi = gray[y:y+fh, x:x+fw]
        face_resized = cv2.resize(face_roi, (IMG_HEIGHT, IMG_WIDTH))
        
        tensor_input = face_resized.astype("float32") / 255.0
        tensor_input = np.expand_dims(tensor_input, axis=-1)
        tensor_input = np.expand_dims(tensor_input, axis=0)

        pred_v = vanilla_model.predict(tensor_input, verbose=0)
        pred_r = resnet_model.predict(tensor_input, verbose=0)
        
        ensemble_probs = (pred_v + pred_r) / 2.0
        probs_list = ensemble_probs[0].tolist()
        
        top_idx = int(np.argmax(probs_list))
        confidence = float(probs_list[top_idx])
        top_label = EMOTION_CLASSES[top_idx]

        probabilities = {EMOTION_CLASSES[i]: float(probs_list[i]) for i in range(len(EMOTION_CLASSES))}

        faces_result.append({
            "index": idx,
            "box": {"x": int(x), "y": int(y), "w": int(fw), "h": int(fh)},
            "top_label": top_label,
            "confidence": confidence,
            "probabilities": probabilities,
            "jelas": confidence >= 0.5
        })

    return {
        "image_width": w,
        "image_height": h,
        "n_faces": len(faces_result),
        "faces": faces_result,
        "message": f"{len(faces_result)} wajah terdeteksi."
    }

if __name__ == "__main__":
    img_path = sys.argv[1]
    result = process_image(img_path)
    print(json.dumps(result))