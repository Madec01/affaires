"""Rebuild the downloadable single-file app and the GitHub Pages entry point."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
src=ROOT/'src'
app=(src/'app.js').read_text()
app=app.replace('/*CLOUD_CORE*/',(src/'cloud-core.js').read_text())
app=app.replace('/*LOCAL_DB*/',(src/'local-db.js').read_text())
app=app.replace('/*CLOUD_TRANSPORT*/',(src/'cloud-transport.js').read_text())
app=app.replace('/*CLOUD_UI*/',(src/'cloud-ui.js').read_text())
shell=(src/'shell.html').read_text().replace('/*CLOUD_CSS*/',(src/'cloud.css').read_text())
# Avoid premature HTML parsing and development-server injection inside HTML strings.
app=app.replace('</script', '<\\/script').replace('</body', '<\\/body').replace('</head', '<\\/head')
html=shell.replace('/*APP_SCRIPT*/',app)
assert '/*APP_SCRIPT*/' not in html and '/*CLOUD_UI*/' not in html
(ROOT/'Repere_Affaires_V1.html').write_text(html)
# Keep the original URL and local filename. The root simply points to the canonical file.
(ROOT/'index.html').write_text('''<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=./Repere_Affaires_V1.html"><title>Repère</title></head><body><p><a href="./Repere_Affaires_V1.html">Ouvrir Repère</a></p></body></html>
''')
print('Built Repère:',len(html.encode()),'bytes')
