param(
    [string]$envFile = ".env"
)

if (-not (Test-Path $envFile)) {
    Write-Error "Error: .env file not found at path: $envFile"
    exit 1
}

Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([\w.-]+)\s*=\s*(.*)\s*$') {
        $key = $matches[1]
        $value = $matches[2]

        # Trim quotes from the value if they exist
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        Write-Host "Loading environment variable: $key"
        [System.Environment]::SetEnvironmentVariable($key, $value, 'Process')
    }
}

Write-Host "Starting Tauri build..."

tauri build --bundles msi --bundles nsis --config backend/tauri.conf.json --verbose

if ($LASTEXITCODE -ne 0) {
    Write-Error "Tauri build failed."
    exit $LASTEXITCODE
}

Write-Host "Tauri build finished."
