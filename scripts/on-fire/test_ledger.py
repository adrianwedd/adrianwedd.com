"""Behavioural tests: private intake, order, atomic capacity and lifetime awards."""
import importlib.util
import json
import multiprocessing
from pathlib import Path
import stat
import tempfile
import unittest
from unittest.mock import patch
from datetime import datetime, timedelta, timezone

SPEC = importlib.util.spec_from_file_location('ledger', Path(__file__).with_name('ledger.py'))
ledger = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ledger)


def application(number=1):
    return dict(business=f'Fictional {number}', website=f'https://example{number}.invalid/', location='Cygnet', contact='Example Owner', email=f'owner{number}@example.invalid', authorised=True, received_at=f'2026-10-24T10:{number:02}:00+00:00', reference=f'fictional-message-{number}')


def concurrent_award(path, identifier):
    try:
        ledger.operate(Path(path), 'award', identifier)
    except ValueError:
        pass


class LedgerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / 'private' / 'ledger.json'

    def receive(self, number=1, **changes):
        data = application(number)
        data.update(changes)
        return ledger.operate(self.path, 'receive', data=data)

    def test_invalid_intake_creates_no_record(self):
        for change in [dict(authorised=False), dict(email='bad'), dict(website='javascript:alert(1)'), dict(website='https://user:pass@example.invalid'), dict(website='http://127.0.0.1'), dict(website='https://example.invalid/?key=private'), dict(contact='x\r\nBcc:someone'), dict(api_key='not-allowed'), dict(received_at='2099-01-01T00:00:00Z')]:
            with self.subTest(change=change), self.assertRaises(ValueError):
                self.receive(**change)
        self.assertFalse(self.path.exists())

    def test_duplicate_www_and_operator_business_key(self):
        first = self.receive()
        second = self.receive(2, website='https://www.example1.invalid/another')
        self.assertEqual(first['id'], second['id'])
        self.assertTrue(second['duplicate'])
        third = self.receive(3, business_key='example1.invalid')
        self.assertTrue(third['duplicate'])
        self.assertEqual(len(json.loads(self.path.read_text())['records']), 1)

    def test_awards_wait_for_earlier_unresolved_applications(self):
        self.receive(2)
        self.receive(1)
        ledger.operate(self.path, 'eligible', 'F001')
        with self.assertRaisesRegex(ValueError, 'earlier'):
            ledger.operate(self.path, 'award', 'F001')
        ledger.operate(self.path, 'declined', 'F002')
        ledger.operate(self.path, 'award', 'F001')
        self.assertEqual(ledger.operate(self.path, 'status')['awarded'], 1)

    def test_lifetime_capacity_and_duplicate_award(self):
        for number in range(1, 12):
            identifier = self.receive(number)['id']
            ledger.operate(self.path, 'eligible', identifier)
        for number in range(1, 11):
            identifier = f'F{number:03}'
            ledger.operate(self.path, 'award', identifier)
            self.assertTrue(ledger.operate(self.path, 'award', identifier)['duplicate_award'])
            ledger.operate(self.path, 'in-progress', identifier)
            ledger.operate(self.path, 'delivered', identifier)
        with self.assertRaisesRegex(ValueError, 'closed'):
            ledger.operate(self.path, 'award', 'F011')
        status = ledger.operate(self.path, 'status')
        self.assertEqual(status['awarded'], 10)
        self.assertTrue(status['closed'])
        self.assertTrue(status['closed_at'])

    def test_withdrawal_never_recycles_award(self):
        identifier = self.receive()['id']
        with self.assertRaises(ValueError):
            ledger.operate(self.path, 'award', identifier)
        ledger.operate(self.path, 'eligible', identifier)
        ledger.operate(self.path, 'award', identifier)
        ledger.operate(self.path, 'withdrawn', identifier)
        self.assertEqual(ledger.operate(self.path, 'status')['awarded'], 1)
        self.assertEqual(stat.S_IMODE(self.path.stat().st_mode), 0o600)
        self.assertEqual(stat.S_IMODE(self.path.parent.stat().st_mode), 0o700)
        self.assertFalse(list(self.path.parent.glob('.ledger-*')))

    def test_concurrent_tenth_award_is_atomic(self):
        for number in range(1, 12):
            identifier = self.receive(number)['id']
            ledger.operate(self.path, 'eligible', identifier)
            if number < 10:
                ledger.operate(self.path, 'award', identifier)
        workers = [multiprocessing.Process(target=concurrent_award, args=(str(self.path), identifier)) for identifier in ['F010', 'F011'] * 8]
        for worker in workers:
            worker.start()
        for worker in workers:
            worker.join(20)
            self.assertEqual(worker.exitcode, 0)
        self.assertEqual(ledger.operate(self.path, 'status')['awarded'], 10)

    def test_corrupt_ledger_fails_closed(self):
        self.receive()
        self.path.write_text('{')
        with self.assertRaises(ValueError):
            ledger.operate(self.path, 'award', 'F001')

    def test_early_closure_blocks_intake_and_new_awards_but_allows_delivery(self):
        first = self.receive(1)['id']
        second = self.receive(2)['id']
        for identifier in (first, second):
            ledger.operate(self.path, 'eligible', identifier)
        ledger.operate(self.path, 'award', first)
        result = ledger.operate(self.path, 'close')
        self.assertTrue(result['closed'])
        self.assertEqual(result['awarded'], 1)
        with patch.object(ledger, 'now', return_value='2099-01-01T00:00:00+00:00'):
            self.assertEqual(ledger.operate(self.path, 'close'), result)
        with self.assertRaisesRegex(ValueError, 'closed'):
            self.receive(3)
        with self.assertRaisesRegex(ValueError, 'closed'):
            ledger.operate(self.path, 'award', second)
        self.assertTrue(ledger.operate(self.path, 'award', first)['duplicate_award'])
        ledger.operate(self.path, 'in-progress', first)
        delivered = ledger.operate(self.path, 'delivered', first)
        self.assertTrue(delivered['closed'])
        self.assertEqual(delivered['awarded'], 1)
        self.assertEqual(ledger.operate(self.path, 'status')['closed_at'], result['closed_at'])
        with self.assertRaises(ValueError):
            ledger.operate(self.path, 'purge')

    def test_early_closure_starts_retention_and_purge_keeps_lifetime_awards(self):
        identifier = self.receive()['id']
        ledger.operate(self.path, 'eligible', identifier)
        ledger.operate(self.path, 'award', identifier)
        closed_at = (datetime.now(timezone.utc) - timedelta(days=91)).isoformat()
        with patch.object(ledger, 'now', return_value=closed_at):
            ledger.operate(self.path, 'close')
        self.assertEqual(ledger.operate(self.path, 'purge'), {'purged': True, 'awarded': 1})
        state = json.loads(self.path.read_text())
        self.assertEqual(set(state['records'][0]), {'id', 'awarded_at', 'status'})
        self.assertEqual(state['closed_at'], closed_at)
        status = ledger.operate(self.path, 'status')
        self.assertTrue(status['closed'])
        self.assertEqual(status['awarded'], 1)
        with self.assertRaises(ValueError):
            self.receive(2)
        for action in ('award', 'withdrawn'):
            with self.assertRaisesRegex(ValueError, 'purged'):
                ledger.operate(self.path, action, identifier)

    def test_close_without_awards_and_after_capacity_preserves_closure_date(self):
        result = ledger.operate(self.path, 'close')
        self.assertEqual(result['awarded'], 0)
        self.assertTrue(ledger.operate(self.path, 'status')['closed'])
        with self.assertRaisesRegex(ValueError, 'closed'):
            self.receive()
        self.path.unlink()
        for number in range(1, 11):
            identifier = self.receive(number)['id']
            ledger.operate(self.path, 'eligible', identifier)
            ledger.operate(self.path, 'award', identifier)
        status = ledger.operate(self.path, 'status')
        result = ledger.operate(self.path, 'close')
        self.assertEqual(result['closed_at'], status['closed_at'])
        self.assertEqual(result['awarded'], 10)

    def test_purge_preserves_anonymous_capacity_and_closes_intake(self):
        identifier = self.receive()['id']
        ledger.operate(self.path, 'eligible', identifier)
        ledger.operate(self.path, 'award', identifier)
        with self.assertRaises(ValueError):
            ledger.operate(self.path, 'purge')
        state = json.loads(self.path.read_text())
        state['closed_at'] = (datetime.now(timezone.utc) - timedelta(days=91)).isoformat()
        self.path.write_text(json.dumps(state))
        ledger.operate(self.path, 'purge')
        retained = self.path.read_text()
        self.assertNotIn('example.invalid', retained)
        self.assertNotIn('identity', retained)
        self.assertNotIn('email', retained)
        self.assertEqual(ledger.operate(self.path, 'status')['awarded'], 1)
        with self.assertRaises(ValueError):
            self.receive(3)


if __name__ == '__main__':
    unittest.main()
