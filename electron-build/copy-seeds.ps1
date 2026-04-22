$src = "c:\Users\Administrator\Desktop\CDR-STUDIO-main"
$dst = "c:\Users\Administrator\Desktop\CDR-STUDIO-main\electron-build\app-src"

if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
New-Item -ItemType Directory -Path "$dst\ia-models" -Force | Out-Null

$files = "index.html","app.js","ai-engine.js","style.css","config.js","gifuct.js","omggif.js","metadata.js","blacklist.js","expirations.js","registered_keys.js"
foreach ($f in $files) {
    if (Test-Path "$src\$f") {
        Copy-Item "$src\$f" "$dst\$f" -Force
        Write-Host "  [seed] $f"
    }
}

Get-ChildItem "$src\ia-models" -Filter "*.js" | ForEach-Object {
    Copy-Item $_.FullName "$dst\ia-models\$($_.Name)" -Force
    Write-Host "  [seed] ia-models\$($_.Name)"
}

Write-Host "Semillas copiadas!" -ForegroundColor Green
