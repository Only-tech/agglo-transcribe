Write-Host "=== Vérification de Python ==="
python --version
if ($LASTEXITCODE -ne 0) {
    Write-Error "Python n'est pas installé ou pas dans le PATH."
    exit 1
}

Write-Host "=== Installation de ffmpeg ==="
# Télécharge ffmpeg release statique
$ffmpegZip = "$env:TEMP\ffmpeg.zip"
Invoke-WebRequest -Uri "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip" -OutFile $ffmpegZip

# Dézippe dans C:\ffmpeg
Expand-Archive -Path $ffmpegZip -DestinationPath "C:\ffmpeg" -Force
Remove-Item $ffmpegZip

# Ajoute ffmpeg\bin au PATH utilisateur
$ffmpegBin = (Get-ChildItem -Directory "C:\ffmpeg")[0].FullName + "\bin"
[System.Environment]::SetEnvironmentVariable("Path", $env:Path + ";" + $ffmpegBin, "User")

Write-Host "ffmpeg installé dans $ffmpegBin"

Write-Host "=== Installation de Whisper et Torch ==="
pip install -U openai-whisper torch

Write-Host "=== Vérification ==="
ffmpeg -version
whisper --help

Write-Host "Installation terminée"
