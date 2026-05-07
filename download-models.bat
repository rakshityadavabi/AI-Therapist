@echo off
echo Downloading face-api.js models...

if not exist "public\models" mkdir "public\models"

set BASE_URL=https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights

echo Downloading tiny_face_detector models...
curl -L "%BASE_URL%/tiny_face_detector_model-weights_manifest.json" -o "public\models\tiny_face_detector_model-weights_manifest.json"
curl -L "%BASE_URL%/tiny_face_detector_model-shard1" -o "public\models\tiny_face_detector_model-shard1"

echo Downloading face_expression models...
curl -L "%BASE_URL%/face_expression_model-weights_manifest.json" -o "public\models\face_expression_model-weights_manifest.json"
curl -L "%BASE_URL%/face_expression_model-shard1" -o "public\models\face_expression_model-shard1"

echo Downloading face_landmark models...
curl -L "%BASE_URL%/face_landmark_68_model-weights_manifest.json" -o "public\models\face_landmark_68_model-weights_manifest.json"
curl -L "%BASE_URL%/face_landmark_68_model-shard1" -o "public\models\face_landmark_68_model-shard1"

echo.
echo All models downloaded successfully!
echo You can now run 'npm start' to start the development server.
echo.
pause