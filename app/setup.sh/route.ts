const script = `#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/hearterzarya/opusx.git"
TARGET_DIR="opusx"

if ! command -v git >/dev/null 2>&1; then
  echo "git is required. Please install git and run again."
  exit 1
fi

if [ -d "$TARGET_DIR" ]; then
  echo "Directory '$TARGET_DIR' already exists. Pulling latest changes..."
  git -C "$TARGET_DIR" pull --ff-only
else
  echo "Cloning OpusX..."
  git clone "$REPO_URL" "$TARGET_DIR"
fi

cd "$TARGET_DIR"
echo "Running OpusX setup..."
node ./bin/opusx.js setup
`;

export async function GET() {
  return new Response(script, {
    status: 200,
    headers: {
      "Content-Type": "text/x-shellscript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
