#!/bin/bash

# Script to download face-api.js models
# Run this script from the project root directory

MODELS_DIR="public/models"

echo "Downloading face-api.js models to $MODELS_DIR..."

# Create models directory if it doesn't exist
mkdir -p "$MODELS_DIR"

# Base URL for face-api.js models
BASE_URL="https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"

# List of required model files
models=(
    "tiny_face_detector_model-weights_manifest.json"
    "tiny_face_detector_model-shard1"
    "face_expression_model-weights_manifest.json"
    "face_expression_model-shard1"
    "face_landmark_68_model-weights_manifest.json"
    "face_landmark_68_model-shard1"
)

# Download each model file
for model in "${models[@]}"; do
    echo "Downloading $model..."
    if command -v curl > /dev/null; then
        curl -L "$BASE_URL/$model" -o "$MODELS_DIR/$model"
    elif command -v wget > /dev/null; then
        wget "$BASE_URL/$model" -O "$MODELS_DIR/$model"
    else
        echo "Error: Neither curl nor wget is available. Please install one of them."
        exit 1
    fi
    
    if [ $? -eq 0 ]; then
        echo "✓ Downloaded $model"
    else
        echo "✗ Failed to download $model"
        exit 1
    fi
done

echo ""
echo "All models downloaded successfully!"
echo "You can now run 'npm start' to start the development server."
echo ""
echo "Note: If you're using Windows, you can also download the models manually:"
echo "1. Visit: https://github.com/justadudewhohacks/face-api.js/tree/master/weights"
echo "2. Download the 6 files listed above"
echo "3. Place them in the public/models/ directory"