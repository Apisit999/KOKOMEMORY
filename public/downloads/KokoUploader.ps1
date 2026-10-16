param(
    [Parameter(Mandatory = $true)]
    [string] $ConfigPath,
    [string] $WatchPath
)

$ErrorActionPreference = "Stop"

function Save-JsonFile([string] $Path, $Value) {
    $temporaryPath = "$Path.tmp"
    $Value | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $temporaryPath -Encoding UTF8
    Move-Item -LiteralPath $temporaryPath -Destination $Path -Force
}

function Get-PhotoContentType([string] $Path) {
    switch ([IO.Path]::GetExtension($Path).ToLowerInvariant()) {
        ".jpg" { return "image/jpeg" }
        ".jpeg" { return "image/jpeg" }
        ".png" { return "image/png" }
        ".webp" { return "image/webp" }
        default { return $null }
    }
}

function Get-StablePhotoId([string] $AlbumId, [string] $Checksum) {
    $sha = [Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [Text.Encoding]::UTF8.GetBytes("$AlbumId`n$Checksum")
        return ([BitConverter]::ToString($sha.ComputeHash($bytes)) -replace "-", "").Substring(0, 32).ToLowerInvariant()
    } finally {
        $sha.Dispose()
    }
}

function Get-FileSignature($File) {
    return "$($File.Length)|$($File.LastWriteTimeUtc.Ticks)"
}

function Invoke-ApiJson($HttpClient, [string] $Method, [string] $Uri, [string] $UploadToken, [string] $JsonBody) {
    $request = [Net.Http.HttpRequestMessage]::new([Net.Http.HttpMethod]::new($Method), $Uri)
    $request.Headers.Authorization = [Net.Http.Headers.AuthenticationHeaderValue]::new("Bearer", $UploadToken)
    if ($JsonBody) { $request.Content = [Net.Http.StringContent]::new($JsonBody, [Text.Encoding]::UTF8, "application/json") }
    try {
        $response = $HttpClient.SendAsync($request).GetAwaiter().GetResult()
        try {
            $body = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
            if (-not $response.IsSuccessStatusCode) { throw "API returned HTTP $([int] $response.StatusCode): $body" }
            if ($body) { return $body | ConvertFrom-Json }
            return $null
        } finally {
            $response.Dispose()
        }
    } finally {
        $request.Dispose()
    }
}

function Send-Photo($HttpClient, $Config, [string] $UploadToken, [string] $Path) {
    $file = Get-Item -LiteralPath $Path
    $contentType = Get-PhotoContentType $Path
    if (-not $contentType -or $file.Length -lt 1 -or $file.Length -gt 25MB) { return $null }

    $checksum = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
    $photoId = Get-StablePhotoId $Config.shareId $checksum
    $endpoint = "$($Config.apiBaseUrl.TrimEnd('/'))/api/admin/gallery/$($Config.bookingId)/uploads"
    $metadata = @{
        shareId = $Config.shareId
        fileName = [IO.Path]::GetFileName($Path)
        contentType = $contentType
        size = $file.Length
        photoId = $photoId
        checksum = $checksum
    } | ConvertTo-Json -Compress

    $init = Invoke-ApiJson $HttpClient "POST" $endpoint $UploadToken $metadata
    if ($init.alreadyUploaded) { return $checksum }

    $stream = [IO.File]::Open($Path, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::Read)
    $content = [Net.Http.StreamContent]::new($stream)
    $content.Headers.ContentType = [Net.Http.Headers.MediaTypeHeaderValue]::Parse($contentType)
    try {
        $putResponse = $HttpClient.PutAsync([Uri] $init.uploadUrl, $content).GetAwaiter().GetResult()
        if (-not $putResponse.IsSuccessStatusCode) {
            throw "R2 upload returned HTTP $([int] $putResponse.StatusCode)"
        }
    } finally {
        if ($null -ne $putResponse) { $putResponse.Dispose() }
        $content.Dispose()
        $stream.Dispose()
    }

    $confirm = @{ shareId = $Config.shareId; photoId = $init.photoId } | ConvertTo-Json -Compress
    $null = Invoke-ApiJson $HttpClient "PATCH" $endpoint $UploadToken $confirm
    return $checksum
}

if (-not (Test-Path -LiteralPath $ConfigPath -PathType Leaf)) {
    throw "Config file not found: $ConfigPath"
}
$resolvedConfigPath = (Resolve-Path -LiteralPath $ConfigPath).Path
$config = Get-Content -LiteralPath $resolvedConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json

if ($config.uploadToken) {
    $protectedToken = ConvertFrom-SecureString (ConvertTo-SecureString ([string] $config.uploadToken) -AsPlainText -Force)
    $config | Add-Member -NotePropertyName protectedUploadToken -NotePropertyValue $protectedToken -Force
    $config.PSObject.Properties.Remove("uploadToken")
    Save-JsonFile $resolvedConfigPath $config
}
if (-not $config.protectedUploadToken) { throw "This uploader config has no protected credential. Download a new config from the admin gallery page." }
$secureToken = ConvertTo-SecureString ([string] $config.protectedUploadToken)
$uploadToken = ([Net.NetworkCredential]::new("", $secureToken)).Password

if (-not $WatchPath) { $WatchPath = [string] $config.watchFolder }
if (-not $WatchPath) { $WatchPath = Read-Host "Enter the folder that receives camera JPEGs" }
if (-not (Test-Path -LiteralPath $WatchPath -PathType Container)) {
    New-Item -ItemType Directory -Path $WatchPath -Force | Out-Null
}
$WatchPath = (Resolve-Path -LiteralPath $WatchPath).Path

$statePath = "$resolvedConfigPath.state.json"
$state = @{}
if (Test-Path -LiteralPath $statePath -PathType Leaf) {
    try {
        $stored = Get-Content -LiteralPath $statePath -Raw -Encoding UTF8 | ConvertFrom-Json
        foreach ($property in $stored.PSObject.Properties) { $state[$property.Name] = [string] $property.Value }
    } catch { Write-Warning "Upload history could not be read; completed files will be checked again." }
}

$seenStable = @{}
$retryAt = @{}
$retryCount = @{}
$invalidReported = @{}
$httpClient = [Net.Http.HttpClient]::new()
$httpClient.Timeout = [TimeSpan]::FromMinutes(10)
$delaySeconds = 3

Write-Host "KOKO Uploader is watching: $WatchPath" -ForegroundColor Cyan
Write-Host "JPEG, PNG and WebP photos are uploaded to the album QR configured for this event. Press Ctrl+C to stop."

try {
    while ($true) {
        $files = Get-ChildItem -LiteralPath $WatchPath -File -Recurse -ErrorAction SilentlyContinue |
            Where-Object { $null -ne (Get-PhotoContentType $_.FullName) }

        foreach ($file in $files) {
            $path = $file.FullName
            $signature = Get-FileSignature $file
            if ($file.Length -gt 25MB) {
                if (-not $invalidReported.ContainsKey($path) -or $invalidReported[$path] -ne $signature) {
                    Write-Warning "$($file.Name) is larger than the 25 MB upload limit and was skipped. Export a smaller JPEG."
                    $invalidReported[$path] = $signature
                }
                continue
            }
            if ($state.ContainsKey($path) -and $state[$path].StartsWith("$signature|", [StringComparison]::Ordinal)) { continue }
            if ($retryAt.ContainsKey($path) -and (Get-Date) -lt $retryAt[$path]) { continue }

            if (-not $seenStable.ContainsKey($path) -or $seenStable[$path] -ne $signature) {
                $seenStable[$path] = $signature
                continue
            }

            try {
                Write-Host "Uploading $($file.Name)..."
                $checksum = Send-Photo $httpClient $config $uploadToken $path
                if ($checksum) {
                    $state[$path] = "$signature|$checksum"
                    Save-JsonFile $statePath $state
                    $retryAt.Remove($path)
                    $retryCount.Remove($path)
                    Write-Host "Uploaded $($file.Name)" -ForegroundColor Green
                }
            } catch {
                $attempt = 1
                if ($retryCount.ContainsKey($path)) { $attempt = [Math]::Min(8, [int] $retryCount[$path] + 1) }
                $retryCount[$path] = $attempt
                $retrySeconds = [Math]::Min(300, [int] [Math]::Pow(2, $attempt))
                $retryAt[$path] = (Get-Date).AddSeconds($retrySeconds)
                Write-Warning "Upload failed for $($file.Name). Retrying in $retrySeconds seconds. $($_.Exception.Message)"
            }
        }

        Start-Sleep -Seconds $delaySeconds
    }
} finally {
    $httpClient.Dispose()
}
