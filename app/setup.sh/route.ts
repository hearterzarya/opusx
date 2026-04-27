const script = `#!/usr/bin/env bash
set -euo pipefail

echo "Installing OpusX CLI..."
npx opusx setup
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
