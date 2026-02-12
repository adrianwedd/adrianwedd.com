// SSR endpoint for personalization data
export const prerender = false;

type PersonalizationData = {
  greeting: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  referrerHostname?: string;
};

function getTimeOfDay(): PersonalizationData['timeOfDay'] {
  const hour = new Date().getHours();
  if (hour < 6) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

function getTimeGreeting(timeOfDay: PersonalizationData['timeOfDay']): string {
  switch (timeOfDay) {
    case 'morning': return 'Good morning.';
    case 'afternoon': return 'Good afternoon.';
    case 'evening': return 'Good evening.';
    case 'night': return 'Late night?';
  }
}

export async function GET({ request }: { request: Request }) {
  const referer = request.headers.get('referer');
  let referrerHostname: string | undefined;

  if (referer) {
    try {
      const url = new URL(referer);
      // Only include external referrers
      if (url.hostname !== 'adrianwedd.com') {
        referrerHostname = url.hostname;
      }
    } catch {
      // Invalid URL, ignore
    }
  }

  const timeOfDay = getTimeOfDay();
  const greeting = getTimeGreeting(timeOfDay);

  const data: PersonalizationData = {
    greeting,
    timeOfDay,
    ...(referrerHostname && { referrerHostname }),
  };

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
