param(
  [ValidateSet('dev', 'build', 'preview')]
  [string]$Command = 'dev'
)

$ErrorActionPreference = 'Stop'

$bundledNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$node = if (Test-Path $bundledNode) { $bundledNode } else { 'node' }
$vite = Join-Path $PSScriptRoot '..\node_modules\vite\bin\vite.js'

if (-not (Test-Path $vite)) {
  throw "Vite is not installed. Run npm install from the web-v2 folder first."
}

switch ($Command) {
  'build' {
    & $node $vite build
  }
  'preview' {
    & $node $vite preview --host 127.0.0.1 --port 3000 --strictPort
  }
  default {
    & $node $vite --host 127.0.0.1 --port 3000 --strictPort
  }
}

exit $LASTEXITCODE
