// Personalization is now handled entirely client-side.
// This file returns a static JSON fallback for any direct requests.
export const prerender = true;

export async function GET() {
  return new Response(JSON.stringify({
    greeting: 'Welcome.',
    timeOfDay: 'afternoon',
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
