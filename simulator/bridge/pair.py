#!/usr/bin/env python3
"""Obtain a short pairing code. Does not control Webots or implement flight physics."""
import json
import argparse
from pathlib import Path
import os
import sys
import urllib.error
import urllib.request


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--env-file', help='Optional local dotenv file; parsed as values, never executed')
    args = parser.parse_args()
    if args.env_file:
        for line in Path(args.env_file).read_text().splitlines():
            if not line.strip() or line.lstrip().startswith('#') or '=' not in line:
                continue
            name, value = line.split('=', 1)
            os.environ.setdefault(name.strip(), value.strip().strip("\"'"))
    backend = os.environ.get('BACKEND_URL', 'http://127.0.0.1:3000').rstrip('/')
    token = os.environ.get('SIMULATOR_TOKEN')
    if not token:
        sys.exit('Set SIMULATOR_TOKEN to the server bootstrap credential (keep it on the bridge host).')
    request = urllib.request.Request(
        backend + '/api/pairing/request', data=b'{}', method='POST',
        headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'},
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            result = json.load(response)
    except (urllib.error.URLError, ValueError):
        sys.exit('Unable to obtain a pairing code. Check backend URL, availability and bridge credential.')
    print('ATLAS BRIDGE / PAIRING')
    print('Code: ' + result['code'])
    print('Expires: ' + result['expiresAt'] + ' (single use)')
    print('Enter this code on your dashboard. This helper does not start a Webots controller.')


if __name__ == '__main__':
    main()
