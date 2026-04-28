const script = `$ErrorActionPreference = "Stop"

$repo = "https://github.com/hearterzarya/opusx.git"
$targetDir = Join-Path (Get-Location) "opusx"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw "git is required. Please install Git and run the command again."
}

if (Test-Path $targetDir) {
  Write-Host "Directory 'opusx' already exists. Pulling latest changes..."
  git -C $targetDir pull --ff-only
} else {
  Write-Host "Cloning OpusX..."
  git clone $repo $targetDir
}

Set-Location $targetDir
Write-Host "Running OpusX setup..."
node .\\bin\\opusx.js setup
`;

export async function GET() {
  return new Response(script, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
