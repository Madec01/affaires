"""Prepare local-only QA pages. Never deploy the preview/ directory."""
from pathlib import Path
import subprocess,shutil
ROOT=Path(__file__).resolve().parents[1]
subprocess.run(['python3',str(ROOT/'scripts/build.py')],check=True)
preview=ROOT/'preview';preview.mkdir(exist_ok=True)
html=(ROOT/'Repere_Affaires_V1.html').read_text()
(preview/'Repere_Affaires_V1.html').write_text(html)
(preview/'index.html').write_text((ROOT/'index.html').read_text())
(preview/'local-check.html').write_text(html.replace("CLOUD_WEB=/^https?:$/.test(location.protocol)","CLOUD_WEB=false"))
(preview/'indexeddb-tests.html').write_text('<!doctype html><html><head><meta charset="utf-8"><title>IndexedDB tests</title></head><body><h1>IndexedDB integration tests</h1><pre id="results"></pre><script>'+(ROOT/'src/local-db.js').read_text()+(ROOT/'tests/indexeddb-browser.js').read_text()+'</script></body></html>')
print('Local QA pages prepared in preview/.')

for name in ['sw.js','manifest.webmanifest']:(preview/name).write_bytes((ROOT/name).read_bytes())
shutil.copytree(ROOT/'assets',preview/'assets',dirs_exist_ok=True)
(preview/'phone-check.html').write_text("""<!doctype html><html lang="fr"><meta charset="utf-8"><title>Repère — vérification téléphone</title><style>body{margin:0;padding:18px;font:15px system-ui;background:#dfe7e4}header{margin-bottom:14px}iframe{width:390px;height:844px;border:0;box-shadow:0 8px 40px #0002;background:white;display:block}label{margin-right:16px}</style><header><label>Largeur <select id="width"><option>320</option><option selected>390</option><option>700</option><option>1200</option></select> px</label> Aperçu local · données fictives</header><iframe id="phone" title="Application téléphone" src="local-check.html"></iframe><script>document.querySelector('#width').onchange=e=>document.querySelector('iframe').style.width=e.target.value+'px'</script></html>""")
