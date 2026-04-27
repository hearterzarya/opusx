const script = `$ErrorActionPreference = "Stop"

Write-Host "Installing OpusX CLI..."
npx opusx setup
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
