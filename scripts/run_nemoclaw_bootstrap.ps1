param(
    [string]$BootstrapPath = "$env:TEMP\nemoclaw-bootstrap-windows.ps1",
    [string]$LogPath = "$env:TEMP\nemoclaw-bootstrap.log"
)

$ErrorActionPreference = 'Continue'
Start-Transcript -Path $LogPath -Force
try {
    if (-not (Test-Path -LiteralPath $BootstrapPath)) {
        throw "NVIDIA bootstrap not found at $BootstrapPath"
    }

    & $BootstrapPath
    $exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { $LASTEXITCODE }
} catch {
    Write-Error $_
    $exitCode = 1
} finally {
    Stop-Transcript
}

exit $exitCode
