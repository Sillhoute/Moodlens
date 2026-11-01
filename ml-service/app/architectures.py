"""Arsitektur model dari notebook UTS Deep Learning.

Nama dan urutan layer harus tetap sama dengan notebook, karena file bobot
.weights.h5 dimuat berdasarkan struktur tersebut.
"""
import tensorflow as tf
from tensorflow.keras import Model, layers
from tensorflow.keras.applications import ResNet50

RESNET_INPUT_SIZE = 96


class ResidualBlock(layers.Layer):
    def __init__(self, filters, stride=1, **kwargs):
        super().__init__(**kwargs)
        self.filters = filters
        self.stride = stride
        self.conv1 = layers.Conv2D(filters, (3, 3), strides=stride, padding="same", activation="relu")
        self.bn1 = layers.BatchNormalization()
        self.conv2 = layers.Conv2D(filters, (3, 3), strides=1, padding="same")
        self.bn2 = layers.BatchNormalization()

        if stride != 1:
            self.shortcut = tf.keras.Sequential([
                layers.Conv2D(filters, (1, 1), strides=stride, padding="same"),
                layers.BatchNormalization(),
            ])
        else:
            self.shortcut = lambda x, training=False: x

    def call(self, inputs, training=False):
        shortcut = self.shortcut(inputs, training=training)
        x = self.conv1(inputs)
        x = self.bn1(x, training=training)
        x = self.conv2(x)
        x = self.bn2(x, training=training)
        x = layers.add([x, shortcut])
        return tf.nn.relu(x)


class AdvancedResidualFERModel(Model):
    def __init__(self, num_classes, **kwargs):
        super().__init__(**kwargs)
        self.init_conv = layers.Conv2D(64, (3, 3), padding="same", activation="relu")
        self.init_bn = layers.BatchNormalization()

        self.res_block1 = ResidualBlock(64, stride=1)
        self.pool1 = layers.MaxPooling2D(2, 2)
        self.drop1 = layers.Dropout(0.3)

        self.res_block2 = ResidualBlock(128, stride=2)
        self.pool2 = layers.MaxPooling2D(2, 2)
        self.drop2 = layers.Dropout(0.3)

        self.res_block3 = ResidualBlock(256, stride=2)
        self.gap = layers.GlobalAveragePooling2D()
        self.dense = layers.Dense(256, activation="relu")
        self.bn_dense = layers.BatchNormalization()
        self.drop_dense = layers.Dropout(0.5)
        self.out = layers.Dense(num_classes, activation="softmax")

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
    def __init__(self, num_classes, **kwargs):
        super().__init__(**kwargs)
        # Berbeda dari notebook: weights=None, karena semua bobot sudah ada di file
        # checkpoint sehingga bobot ImageNet tidak perlu diunduh saat aplikasi berjalan.
        self.base_model = ResNet50(
            input_shape=(RESNET_INPUT_SIZE, RESNET_INPUT_SIZE, 3),
            include_top=False,
            weights=None,
        )
        self.gap = layers.GlobalAveragePooling2D()
        self.dense = layers.Dense(256, activation="relu")
        self.bn = layers.BatchNormalization()
        self.dropout = layers.Dropout(0.5)
        self.out = layers.Dense(num_classes, activation="softmax")

    def call(self, inputs, training=False):
        x = tf.image.grayscale_to_rgb(inputs)
        x = tf.image.resize(x, (RESNET_INPUT_SIZE, RESNET_INPUT_SIZE))
        x = x * 255.0
        x = tf.keras.applications.resnet50.preprocess_input(x)

        x = self.base_model(x, training=training)
        x = self.gap(x)
        x = self.dense(x)
        x = self.bn(x, training=training)
        x = self.dropout(x, training=training)
        return self.out(x)
