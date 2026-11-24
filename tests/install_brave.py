"""Extract the official stable Brave release for CI browser verification."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import urllib.request

request=urllib.request.Request(
    'https://api.github.com/repos/brave/brave-browser/releases/latest',
    headers={'Accept':'application/vnd.github+json','User-Agent':'Lumen-Interview-CI'})
with urllib.request.urlopen(request,timeout=45) as response:
    release=json.load(response)
asset=next(a for a in release['assets'] if a['name'].startswith('brave-browser_') and a['name'].endswith('_amd64.deb'))
root=Path(tempfile.mkdtemp(prefix='lumen-brave-'))
package=root/'brave.deb'
urllib.request.urlretrieve(asset['browser_download_url'],package)
subprocess.run(['dpkg-deb','-x',str(package),str(root)],check=True)
binary=root/'opt/brave.com/brave/brave'
assert binary.is_file(), 'Official Brave executable missing'
with open(os.environ['GITHUB_ENV'],'a') as env:
    env.write(f'BRAVE_PATH={binary}\n')
print('Official stable Brave:',release['tag_name'])
