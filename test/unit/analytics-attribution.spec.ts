import { describe, expect, it } from 'vitest';
import { campaignParameters } from '../../src/lib/analytics-attribution';

describe('query-free analytics acquisition', () => {
  it('maps an Undertow arrival into standard GA acquisition fields', () => {
    expect(
      campaignParameters({
        utm_source: 'undertow',
        utm_medium: 'referral',
        utm_campaign: 'undertow_station',
      }),
    ).toEqual({
      campaign_source: 'undertow',
      campaign_medium: 'referral',
      campaign_name: 'undertow_station',
    });
  });
  it('does not add campaign overrides to an unattributed arrival', () => {
    expect(campaignParameters({})).toEqual({});
  });
  it('keeps the existing field and length boundaries for stored data', () => {
    expect(
      campaignParameters({
        utm_source: 'a'.repeat(120),
        utm_medium: { private: 'data' },
        utm_campaign: '',
        email: 'person@example.test',
        payment_id: 'private',
        utm_content: ' card<> ',
      }),
    ).toEqual({ campaign_source: 'a'.repeat(100), campaign_content: 'card' });
  });
});
