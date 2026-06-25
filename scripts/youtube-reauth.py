#!/usr/bin/env python3
"""
Re-authenticate the YouTube OAuth token (the upload script only refreshes an
existing token; when the refresh grant is dead — e.g. after an incident token
rotation — run this to do a fresh consent flow and write a new token).

Opens a browser for consent. The token is written to
~/.config/adrianwedd/youtube-token.json, where upload-videos-to-youtube.py
and update-youtube-descriptions.py read it.

Usage:
  python3 scripts/youtube-reauth.py
"""
from pathlib import Path
from google_auth_oauthlib.flow import InstalledAppFlow

CLIENT_PATH = Path.home() / '.config/adrianwedd/youtube-oauth-client.json'
TOKEN_PATH = Path.home() / '.config/adrianwedd/youtube-token.json'
SCOPES = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube',
]
EXPECTED_CHANNEL = 'UC709-RgQ-IMi-GffU9guqUQ'  # @adrianwedd — verify the chooser hits THIS one

if not CLIENT_PATH.exists():
    raise SystemExit(f'Missing OAuth client: {CLIENT_PATH}')

flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_PATH), SCOPES)
creds = flow.run_local_server(port=0, access_type='offline', prompt='consent')

TOKEN_PATH.parent.mkdir(parents=True, exist_ok=True)
TOKEN_PATH.write_text(creds.to_json())
TOKEN_PATH.chmod(0o600)
print(f'Wrote token to {TOKEN_PATH}')
print('Consent in the browser MUST have been for the @adrianwedd channel '
      f'({EXPECTED_CHANNEL}); the OAuth chooser has known decoy accounts. '
      'Verify with: python3 scripts/upload-videos-to-youtube.py --dry-run')