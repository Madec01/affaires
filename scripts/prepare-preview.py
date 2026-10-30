"""Prepare local-only QA pages. Never deploy the preview/ directory."""
from pathlib import Path
import subprocess
ROOT=Path(__file__).resolve().parents[1]
subprocess.run(['python3',str(ROOT/'scripts/build.py')],check=True)
preview=ROOT/'preview';preview.mkdir(exist_ok=True)
html=(ROOT/'Repere_Affaires_V1.html').read_text()
(preview/'Repere_Affaires_V1.html').write_text(html)
(preview/'index.html').write_text((ROOT/'index.html').read_text())
(preview/'local-check.html').write_text(html.replace("CLOUD_WEB=/^https?:$/.test(location.protocol)","CLOUD_WEB=false"))
(preview/'indexeddb-tests.html').write_text('<!doctype html><html><head><meta charset="utf-8"><title>IndexedDB tests</title></head><body><h1>IndexedDB integration tests</h1><pre id="results"></pre><script>'+(ROOT/'src/local-db.js').read_text()+(ROOT/'tests/indexeddb-browser.js').read_text()+'</script></body></html>')
print('Local QA pages prepared in preview/.')
