#!/usr/bin/env python3
"""
THE BUSINESS WORK — PRIVATE INSTAGRAM EVENT API (V4 PRO)
Binds to Docker Bridge 172.18.0.1:3002.
Zero incoming public exposure. Requires Header Auth: X-TBW-Webhook-Secret.
Provides: /healthz, /register, /comment-check, /dm-context, /log.
"""
import argparse
import hmac
import json
import os
import re
import sqlite3
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(os.environ.get('IG_EVENT_ROOT', '/opt/tbw-instagram-event-api'))
DB_PATH = ROOT / 'data' / 'instagram.sqlite3'
RULES_PATH = ROOT / 'comment_rules.json'
TOKEN = os.environ.get('IG_EVENT_SECRET', '')
BIND = os.environ.get('IG_EVENT_BIND', '172.18.0.1')
PORT = int(os.environ.get('IG_EVENT_PORT', '3002'))
DASHBOARD_URL = os.environ.get('DASHBOARD_URL', 'https://dashboard.thebusinesswork.com')


def connection():
    os.makedirs(DB_PATH.parent, exist_ok=True)
    c = sqlite3.connect(DB_PATH, timeout=15, isolation_level=None)
    c.execute('PRAGMA busy_timeout = 15000')
    c.execute('PRAGMA journal_mode = WAL')
    c.execute('CREATE TABLE IF NOT EXISTS instagram_events (event_type TEXT NOT NULL, event_id TEXT NOT NULL, user_id TEXT NOT NULL, received_at INTEGER NOT NULL, PRIMARY KEY(event_type,event_id))')
    c.execute('CREATE TABLE IF NOT EXISTS instagram_leads (user_id TEXT PRIMARY KEY, created_at INTEGER NOT NULL)')
    c.execute('CREATE TABLE IF NOT EXISTS instagram_modes (user_id TEXT PRIMARY KEY, mode TEXT NOT NULL DEFAULT \'ai\', updated_at INTEGER NOT NULL)')
    c.execute('CREATE TABLE IF NOT EXISTS instagram_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, event_type TEXT NOT NULL, payload TEXT NOT NULL, created_at INTEGER NOT NULL)')
    c.execute('''CREATE TABLE IF NOT EXISTS instagram_reel_rules (
        id TEXT PRIMARY KEY,
        media_id TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        trigger_mode TEXT NOT NULL DEFAULT 'any_comment',
        keywords TEXT NOT NULL DEFAULT '[]',
        initial_dm_text TEXT NOT NULL,
        details_text TEXT NOT NULL,
        follow_required INTEGER NOT NULL DEFAULT 1,
        whatsapp_prefill TEXT DEFAULT '',
        comments_count INTEGER DEFAULT 0,
        updated_at INTEGER NOT NULL
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS instagram_comment_intents (
        comment_id TEXT PRIMARY KEY,
        media_id TEXT NOT NULL,
        user_id TEXT,
        rule_id TEXT,
        state TEXT NOT NULL DEFAULT 'pending',
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS instagram_customer_context (
        user_id TEXT PRIMARY KEY,
        media_id TEXT NOT NULL,
        rule_id TEXT,
        expires_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
    )''')
    c.execute('CREATE TABLE IF NOT EXISTS instagram_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL)')
    return c


def json_response(handler, code, obj):
    payload = json.dumps(obj, ensure_ascii=False, separators=(',', ':')).encode('utf8')
    handler.send_response(code)
    handler.send_header('Content-Type', 'application/json; charset=utf-8')
    handler.send_header('Cache-Control', 'no-store')
    handler.send_header('Content-Length', str(len(payload)))
    handler.end_headers()
    handler.wfile.write(payload)


def get_whatsapp_url(prefill=''):
    con = connection()
    try:
        row = con.execute('SELECT value FROM instagram_settings WHERE key="whatsapp_business_phone"').fetchone()
        phone = row[0] if row else os.environ.get('WHATSAPP_BUSINESS_PHONE', '')
        phone = re.sub(r'\D', '', str(phone))
        if 10 <= len(phone) <= 15:
            clean_text = str(prefill or '').strip()[:500]
            if clean_text:
                return 'https://wa.me/%s?text=%s' % (phone, urllib.parse.quote(clean_text))
            return 'https://wa.me/%s' % phone
    finally:
        con.close()
    return ''


def register(event):
    event_type = str(event.get('event_type') or '')
    event_id = str(event.get('event_id') or '')
    user_id = str(event.get('ig_user_id') or '')
    if event_type not in ('dm', 'comment') or not (1 <= len(event_id) <= 200) or not re.fullmatch(r'\d{5,40}', user_id):
        return 400, {'error': 'Invalid event_type, event_id or ig_user_id'}
    now = int(time.time())
    con = connection()
    try:
        con.execute('BEGIN IMMEDIATE')
        inserted = con.execute('INSERT OR IGNORE INTO instagram_events(event_type,event_id,user_id,received_at) VALUES(?,?,?,?)', (event_type, event_id, user_id, now)).rowcount == 1
        new_lead = False
        if inserted and event_type == 'dm':
            new_lead = con.execute('INSERT OR IGNORE INTO instagram_leads(user_id,created_at) VALUES(?,?)', (user_id, now)).rowcount == 1
        mode_row = con.execute('SELECT mode FROM instagram_modes WHERE user_id=?', (user_id,)).fetchone()
        mode = mode_row[0] if mode_row else 'ai'
        if now % 60 == 0:
            con.execute('DELETE FROM instagram_events WHERE received_at < ?', (now - 90 * 86400,))
            con.execute('DELETE FROM instagram_logs WHERE created_at < ?', (now - 30 * 86400,))
            con.execute('DELETE FROM instagram_comment_intents WHERE expires_at < ?', (now,))
            con.execute('DELETE FROM instagram_customer_context WHERE expires_at < ?', (now,))
        con.execute('COMMIT')
    except Exception:
        con.execute('ROLLBACK')
        raise
    finally:
        con.close()

    return 200, {
        **{k: v for k, v in event.items() if k in ('event_id', 'event_type', 'ig_user_id', 'username', 'name', 'text', 'comment_id', 'media_id', 'reel_url', 'timestamp', 'channel', 'source')},
        'accepted': inserted,
        'is_new_lead': new_lead,
        'mode': mode,
        'reply_allowed': inserted and mode == 'ai',
    }


def check_comment(event):
    if event.get('event_type') != 'comment' or event.get('mode') == 'human' or event.get('reply_allowed') is False:
        return {**event, 'approved': False, 'reply_text': ''}

    comment_id = str(event.get('comment_id') or event.get('id') or '').strip()
    media_id = str(event.get('media_id') or '').strip()
    user_id = str(event.get('ig_user_id') or event.get('user_id') or '').strip()
    text = str(event.get('text') or '').strip()
    now = int(time.time())

    if not re.fullmatch(r'\d{5,80}', comment_id) or not media_id:
        return {**event, 'approved': False, 'reply_text': ''}

    raw_ts = event.get('timestamp')
    if raw_ts:
        try:
            ts = time.mktime(time.strptime(str(raw_ts)[:19], "%Y-%m-%dT%H:%M:%S"))
            if now - ts >= 7 * 86400 or now - ts < 0:
                return {**event, 'approved': False, 'reply_text': ''}
        except Exception:
            pass

    con = connection()
    try:
        con.execute('BEGIN IMMEDIATE')
        reserved = con.execute('INSERT OR IGNORE INTO instagram_comment_intents(comment_id,media_id,user_id,state,created_at,expires_at) VALUES(?,?,?,?,?,?)',
                               (comment_id, media_id, user_id, 'pending', now, now + 7 * 86400)).rowcount == 1
        if not reserved:
            con.execute('ROLLBACK')
            return {**event, 'approved': False, 'reply_text': ''}

        rule_row = con.execute('SELECT id, trigger_mode, keywords, initial_dm_text, enabled FROM instagram_reel_rules WHERE media_id=?', (media_id,)).fetchone()
        rule = None
        if rule_row:
            rule = {
                'id': rule_row[0],
                'trigger_mode': rule_row[1],
                'keywords': json.loads(rule_row[2]) if rule_row[2] else [],
                'reply_text': rule_row[3],
                'enabled': bool(rule_row[4]),
            }
        elif RULES_PATH.exists():
            try:
                data = json.loads(RULES_PATH.read_text(encoding='utf8'))
                for r in data.get('rules', []):
                    if str(r.get('media_id', '')) == media_id:
                        rule = {
                            'id': r.get('id', 'rule_' + media_id),
                            'trigger_mode': r.get('trigger_mode', 'keywords'),
                            'keywords': r.get('keywords', []),
                            'reply_text': r.get('reply_text', ''),
                            'enabled': r.get('enabled', False),
                        }
                        break
            except Exception:
                pass

        if not rule or not rule.get('enabled'):
            con.execute('ROLLBACK')
            return {**event, 'approved': False, 'reply_text': ''}

        is_matched = False
        trigger_mode = rule.get('trigger_mode', 'any_comment')
        if trigger_mode == 'any_comment':
            is_matched = True
        else:
            low_text = text.lower()
            keywords = [str(k).strip().lower() for k in rule.get('keywords', []) if str(k).strip()]
            if keywords and any(re.search(r'(?<!\w)' + re.escape(k) + r'(?!\w)', low_text) for k in keywords):
                is_matched = True

        if not is_matched:
            con.execute('ROLLBACK')
            return {**event, 'approved': False, 'reply_text': ''}

        answer = str(rule.get('reply_text') or '').strip()
        if not (1 <= len(answer) <= 950):
            con.execute('ROLLBACK')
            return {**event, 'approved': False, 'reply_text': ''}

        if re.fullmatch(r'\d{5,40}', user_id):
            con.execute('INSERT INTO instagram_customer_context(user_id,media_id,rule_id,expires_at,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET media_id=excluded.media_id,rule_id=excluded.rule_id,expires_at=excluded.expires_at,updated_at=excluded.updated_at',
                        (user_id, media_id, rule.get('id'), now + 86400, now))

        con.execute('UPDATE instagram_comment_intents SET rule_id=? WHERE comment_id=?', (rule.get('id'), comment_id))
        con.execute('COMMIT')

        return {
            **event,
            'approved': True,
            'reply_text': answer,
            'rule_id': rule.get('id', ''),
            'media_id': media_id,
            'comment_id': comment_id,
        }
    except Exception:
        con.execute('ROLLBACK')
        raise
    finally:
        con.close()


def dm_context(event):
    event_id = str(event.get('event_id') or event.get('id') or f'dm_{int(time.time()*1000)}')
    user_id = str(event.get('ig_user_id') or event.get('sender_id') or '').strip()
    username = str(event.get('username') or '').replace('@', '').strip()
    text = str(event.get('text') or event.get('content') or '').strip()
    payload = str(event.get('quick_reply_payload') or event.get('payload') or '').strip()
    ref_media = str(event.get('referral_media_id') or event.get('media_id') or '').strip()

    if not re.fullmatch(r'\d{5,40}', user_id):
        return {
            'approved': False,
            'event_type': 'dm',
            'event_id': event_id,
            'ig_user_id': user_id,
            'username': username,
            'text': text,
            'mode': 'ai',
            'reply_allowed': False,
            'is_first_dm': False,
            'whatsapp_url': '',
            'campaign': None,
        }

    con = connection()
    try:
        mode_row = con.execute('SELECT mode FROM instagram_modes WHERE user_id=?', (user_id,)).fetchone()
        mode = mode_row[0] if mode_row else 'ai'
        if mode == 'human':
            return {
                'approved': False,
                'event_type': 'dm',
                'event_id': event_id,
                'ig_user_id': user_id,
                'username': username,
                'text': text,
                'mode': 'human',
                'reply_allowed': False,
                'is_first_dm': False,
                'whatsapp_url': '',
                'campaign': None,
            }

        now = int(time.time())
        media_id = None
        if ref_media and re.fullmatch(r'\d{5,80}', ref_media):
            media_id = ref_media
        else:
            ctx_row = con.execute('SELECT media_id, rule_id, expires_at FROM instagram_customer_context WHERE user_id=?', (user_id,)).fetchone()
            if ctx_row and ctx_row[2] > now:
                media_id = ctx_row[0]

        campaign = None
        whatsapp_prefill = ''
        if media_id:
            rule_row = con.execute('SELECT id, initial_dm_text, details_text, follow_required, whatsapp_prefill, enabled FROM instagram_reel_rules WHERE media_id=?', (media_id,)).fetchone()
            if rule_row and rule_row[5]:
                campaign = {
                    'id': rule_row[0],
                    'media_id': media_id,
                    'active': True,
                    'initial_message': rule_row[1],
                    'details_text': rule_row[2],
                    'follow_required': bool(rule_row[3]),
                }
                whatsapp_prefill = rule_row[4] or ''

        whatsapp_url = get_whatsapp_url(whatsapp_prefill)
        lead_row = con.execute('SELECT created_at FROM instagram_leads WHERE user_id=?', (user_id,)).fetchone()
        is_first_dm = event.get('is_first_dm') is True or (lead_row and (now - lead_row[0]) < 15)

        return {
            'approved': True,
            'event_type': 'dm',
            'event_id': event_id,
            'ig_user_id': user_id,
            'username': username,
            'text': text,
            'quick_reply_payload': payload,
            'mode': 'ai',
            'reply_allowed': True,
            'is_first_dm': bool(is_first_dm),
            'whatsapp_url': whatsapp_url,
            'campaign': campaign,
            'clear_campaign': campaign is None,
        }
    finally:
        con.close()


def add_log(data):
    event_type = str(data.get('event_type', ''))[:70] or 'event'
    user_id = str(data.get('ig_user_id') or '')
    payload = json.dumps(data, ensure_ascii=False)[:20000]
    con = connection()
    try:
        con.execute('BEGIN IMMEDIATE')
        con.execute('INSERT INTO instagram_logs(event_type,payload,created_at) VALUES(?,?,?)', (event_type, payload, int(time.time())))
        if event_type == 'conversation_state' and data.get('mode') == 'human' and re.fullmatch(r'\d{5,40}', user_id):
            con.execute('INSERT INTO instagram_modes(user_id,mode,updated_at) VALUES(?,\'human\',?) ON CONFLICT(user_id) DO UPDATE SET mode=\'human\',updated_at=excluded.updated_at',
                        (user_id, int(time.time())))
        con.execute('COMMIT')
    except Exception:
        con.execute('ROLLBACK')
        raise
    finally:
        con.close()
    return {'saved': True}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print('%s %s' % (self.address_string(), fmt % args), flush=True)

    def do_GET(self):
        if self.path == '/healthz':
            return json_response(self, 200, {'status': 'ok', 'service': 'tbw-instagram-event-api', 'version': '4.0.0-pro'})
        return json_response(self, 404, {'error': 'Not found'})

    def do_POST(self):
        received = self.headers.get('X-TBW-Webhook-Secret', '')
        if not TOKEN or not hmac.compare_digest(received, TOKEN):
            return json_response(self, 403, {'error': 'Forbidden'})
        length = self.headers.get('Content-Length', '')
        if not length.isdigit() or int(length) > 65536:
            return json_response(self, 413, {'error': 'Invalid body length'})
        try:
            obj = json.loads(self.rfile.read(int(length)))
            if not isinstance(obj, dict):
                raise ValueError('Body must be an object')
        except (ValueError, UnicodeError):
            return json_response(self, 400, {'error': 'Invalid JSON'})

        try:
            if self.path == '/register':
                code, result = register(obj)
            elif self.path == '/comment-check':
                code, result = 200, check_comment(obj)
            elif self.path == '/dm-context':
                code, result = 200, dm_context(obj)
            elif self.path == '/log':
                code, result = 200, add_log(obj)
            else:
                return json_response(self, 404, {'error': 'Not found'})
            return json_response(self, code, result)
        except sqlite3.Error as e:
            print(f'Database error during request: {e}', flush=True)
            return json_response(self, 500, {'error': 'Storage unavailable'})


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--set-mode', nargs=2, metavar=('IG_USER_ID', 'ai|human'))
    parser.add_argument('--show-mode', metavar='IG_USER_ID')
    parser.add_argument('--set-phone', metavar='PHONE_DIGITS')
    args = parser.parse_args()

    if args.set_phone:
        phone = re.sub(r'\D', '', args.set_phone)
        con = connection()
        con.execute('INSERT INTO instagram_settings(key,value,updated_at) VALUES("whatsapp_business_phone",?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at',
                    (phone, int(time.time())))
        con.close()
        print('WhatsApp Business phone updated:', phone)
        return

    if args.set_mode or args.show_mode:
        user = (args.set_mode or [args.show_mode])[0]
        if not re.fullmatch(r'\d{5,40}', user):
            raise SystemExit('Invalid Instagram user ID')
        con = connection()
        if args.show_mode:
            row = con.execute('SELECT mode FROM instagram_modes WHERE user_id=?', (user,)).fetchone()
            print(row[0] if row else 'ai')
        else:
            mode = args.set_mode[1]
            if mode not in ('ai', 'human'):
                raise SystemExit('Mode must be ai or human')
            con.execute('INSERT INTO instagram_modes(user_id,mode,updated_at) VALUES(?,\'human\',?) ON CONFLICT(user_id) DO UPDATE SET mode=excluded.mode,updated_at=excluded.updated_at',
                        (user, mode, int(time.time())))
            print('Mode updated:', mode)
        con.close()
        return

    if not TOKEN or len(TOKEN) < 20:
        raise SystemExit('IG_EVENT_SECRET must be configured (at least 20 characters)')
    con = connection()
    con.close()
    print('TBW Instagram event API V4 PRO serving on %s:%d' % (BIND, PORT), flush=True)
    ThreadingHTTPServer((BIND, PORT), Handler).serve_forever()


if __name__ == '__main__':
    main()
