// page_location deliberately excludes the query. Map the separately retained,
// bounded UTM values to GA's standard campaign fields as well as custom utm_*.
export function campaignParameters(attribution: Record<string, unknown>): Record<string, string> {
  const fields = {
    utm_source: 'campaign_source',
    utm_medium: 'campaign_medium',
    utm_campaign: 'campaign_name',
    utm_content: 'campaign_content',
    utm_term: 'campaign_term',
  };
  const result: Record<string, string> = {};
  for (const [utm, campaign] of Object.entries(fields)) {
    const value = attribution[utm];
    if (typeof value !== 'string') continue;
    const bounded = value
      .replace(/[^a-zA-Z0-9._~ -]/g, '')
      .trim()
      .slice(0, 100);
    if (bounded) result[campaign] = bounded;
  }
  return result;
}
