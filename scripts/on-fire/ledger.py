#!/usr/bin/env python3
"""Private, single-host campaign ledger. Never fetches a submitted URL or sends mail.

Input containing personal data is read from stdin, never command arguments.
Only non-identifying IDs/counts go to stdout. State is outside the repository.
"""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import tempfile
from datetime import datetime, timezone
from urllib.parse import urlsplit

DEFAULT = Path.home() / '.local/share/on-fire-campaign/ledger.json'
LIMIT = 10


def now():
    return datetime.now(timezone.utc).isoformat()


def text(data, key, maximum):
    value = data.get(key)
    if not isinstance(value, str) or not value.strip() or len(value) > maximum:
        raise ValueError(f'{key} required (max {maximum} characters)')
    if any(ord(c) < 32 for c in value):
        raise ValueError(f'{key} contains control characters')
    return value.strip()


def received_time(value):
    try:
        date = datetime.fromisoformat(value.replace('Z', '+00:00'))
        if date.tzinfo is None:
            raise ValueError()
        if date > datetime.now(timezone.utc):
            raise ValueError()
        return date.astimezone(timezone.utc).isoformat()
    except (ValueError, AttributeError):
        raise ValueError('received_at must be a past, timezone-qualified mailbox timestamp') from None


def receive(state, data):
    if state.get('purged_at'):
        raise ValueError('campaign records have been purged; intake is closed')
    allowed = {'business', 'website', 'location', 'contact', 'email', 'authorised', 'received_at', 'reference', 'business_key'}
    if set(data) - allowed:
        raise ValueError('unexpected fields; do not store credentials or sensitive details')
    if data.get('authorised') is not True:
        raise ValueError('written authority confirmation required before recording a valid application')
    record = {k: text(data, k, n) for k, n in [('business', 200), ('website', 500), ('location', 200), ('contact', 200), ('email', 254), ('reference', 200)]}
    if not re.fullmatch(r'[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+', record['email']):
        raise ValueError('valid contact email required')
    url = urlsplit(record['website'])
    if url.scheme not in ('http', 'https') or not url.hostname or '.' not in url.hostname or url.username or url.password or url.query or url.fragment:
        raise ValueError('public http(s) website required, without credentials, query or fragment')
    import ipaddress
    host = url.hostname.lower().removeprefix('www.').rstrip('.')
    if host.endswith(('.localhost', '.local', '.internal')):
        raise ValueError('public website required')
    try:
        if not ipaddress.ip_address(host).is_global:
            raise ValueError('public website required')
    except ValueError as error:
        if str(error) == 'public website required':
            raise
    # Operator resolves businesses with multiple domains to the same stable business_key.
    key = text(data, 'business_key', 200).lower() if 'business_key' in data else host
    identity = hashlib.sha256(key.encode()).hexdigest()
    for existing in state['records']:
        if existing.get('identity') == identity:
            return {'id': existing['id'], 'duplicate': True, 'status': existing['status']}
    if state.get('purged_at'):
        raise ValueError('campaign records have been purged; intake is closed')
    record.update(id=f"F{len(state['records']) + 1:03}", identity=identity, received_at=received_time(data.get('received_at')), authorised=True, status='submitted', awarded_at=None, history=[{'at': now(), 'event': 'submitted'}])
    state['records'].append(record)
    return {'id': record['id'], 'duplicate': False, 'status': 'submitted'}


def count(state):
    return sum(r['awarded_at'] is not None for r in state['records'])


def transition(state, identifier, action):
    record = next((r for r in state['records'] if r['id'] == identifier), None)
    if not record:
        raise ValueError('unknown application ID')
    if state.get('purged_at'):
        raise ValueError('campaign records have been purged')
    if action == 'award':
        if record['awarded_at']:
            return {'id': identifier, 'duplicate_award': True, 'awarded': count(state)}
        if record['status'] != 'eligible':
            raise ValueError('eligibility and authority must be verified first')
        queue = sorted((r for r in state['records'] if r['status'] in ('submitted', 'eligible') and not r['awarded_at']), key=lambda r: (r['received_at'], r['id']))
        if queue[0]['id'] != identifier:
            raise ValueError('resolve earlier submissions first; awards follow mailbox submission order')
        if count(state) >= LIMIT:
            raise ValueError('all ten places have already been awarded')
        record['awarded_at'] = now()
        record['status'] = 'awarded'
        if count(state) == LIMIT:
            state['closed_at'] = now()
    else:
        legal = {'eligible': ('submitted',), 'declined': ('submitted', 'eligible'), 'in-progress': ('awarded',), 'delivered': ('in-progress',), 'withdrawn': ('submitted', 'eligible', 'awarded', 'in-progress')}
        if action not in legal or record['status'] not in legal[action]:
            raise ValueError('invalid status transition')
        record['status'] = action
    record['history'].append({'at': now(), 'event': action})
    return {'id': identifier, 'status': record['status'], 'awarded': count(state), 'closed': count(state) >= LIMIT}


def operate(path, action, identifier=None, data=None):
    path = path.expanduser().resolve()
    repository = Path(__file__).resolve().parents[2]
    if path.is_relative_to(repository):
        raise ValueError('private ledger must be stored outside the repository')
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(path.parent, 0o700)
    # Lock a stable sibling inode: replacing the JSON file must not release the lock.
    with open(str(path) + '.lock', 'a', encoding='utf-8') as lock:
        os.chmod(lock.name, 0o600)
        fcntl.flock(lock, fcntl.LOCK_EX)
        state = json.loads(path.read_text()) if path.exists() else {'schema': 1, 'records': [], 'closed_at': None}
        if not isinstance(state, dict) or state.get('schema') != 1 or count(state) > LIMIT:
            raise ValueError('invalid ledger; restore a verified private backup')
        if action == 'receive':
            result = receive(state, data)
        elif action == 'status':
            return {'awarded': count(state), 'limit': LIMIT, 'closed': count(state) >= LIMIT, 'closed_at': state['closed_at'], 'queue': [{'id': r['id'], 'status': r['status'], 'received_at': r.get('received_at')} for r in state['records']]}
        elif action == 'purge':
            if not state['closed_at'] or (datetime.now(timezone.utc) - datetime.fromisoformat(state['closed_at'])).days < 90:
                raise ValueError('purge only after closure plus 90 days; handle individual deletion requests separately')
            # Keep only anonymous place-consumption tombstones; no host hashes or contact data.
            state['records'] = [{'id': r['id'], 'awarded_at': r['awarded_at'], 'status': r['status']} for r in state['records'] if r['awarded_at']]
            state['purged_at'] = now()
            result = {'purged': True, 'awarded': count(state)}
        else:
            result = transition(state, identifier, action)
        descriptor, temporary = tempfile.mkstemp(dir=path.parent, prefix='.ledger-')
        try:
            with os.fdopen(descriptor, 'w', encoding='utf-8') as output:
                json.dump(state, output, indent=2)
                output.write('\n')
                output.flush()
                os.fsync(output.fileno())
            os.replace(temporary, path)
            directory = os.open(path.parent, os.O_RDONLY)
            try:
                os.fsync(directory)
            finally:
                os.close(directory)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)
        return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ledger', type=Path, default=DEFAULT)
    parser.add_argument('action', choices=['receive', 'status', 'eligible', 'declined', 'award', 'in-progress', 'delivered', 'withdrawn', 'purge'])
    parser.add_argument('id', nargs='?')
    args = parser.parse_args()
    try:
        data = None
        if args.action == 'receive':
            raw = sys.stdin.read(16001)
            if len(raw) > 16000:
                raise ValueError('application too large')
            data = json.loads(raw)
            if not isinstance(data, dict):
                raise ValueError('application must be an object')
        print(json.dumps(operate(args.ledger, args.action, args.id, data)))
    except (ValueError, KeyError, OSError):
        # Never echo input, parser text or filesystem details containing client data.
        print('Operation not confirmed. Check the private ledger status before retrying; verify fields, authority, queue order and capacity.', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
