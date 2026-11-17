param(
    [string]$Key,
    [switch]$CheckOnly
)

$ErrorActionPreference = 'Stop'
# The normal workflow reads the copied Publishable Key and replaces the clipboard
# with environment-variable lines. Never print key material to terminal output.
if ([string]::IsNullOrWhiteSpace($Key)) {
    $Key = Get-Clipboard -Raw
}
$Key = $Key.Trim()
if ($Key -notmatch '^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$') {
    throw 'Clipboard does not contain a complete JWT Publishable Key. Copy only the key and retry.'
}
$taskPayload = $Key.Split('.')[1].Replace('-', '+').Replace('_', '/')
$taskPayload = $taskPayload.PadRight($taskPayload.Length + ((4 - $taskPayload.Length % 4) % 4), '=')
try {
    $taskClaims = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($taskPayload)) | ConvertFrom-Json
} catch {
    throw 'Cannot read the key type. Copy the complete Publishable Key and retry.'
}
# This is a local type check, not signature verification or authorization.
if ($taskClaims.role -ne 'anon') {
    throw 'Only an anon Publishable Key is accepted. Do not use a service_role/API Key.'
}
$taskChunkSize = 900
$taskCount = [int][Math]::Ceiling($Key.Length / $taskChunkSize)
if ($taskCount -gt 16) { throw 'Key exceeds 16 parts; review the deployment configuration.' }
$taskLines = [Collections.Generic.List[string]]::new()
$taskLengths = [Collections.Generic.List[int]]::new()
for ($taskIndex = 0; $taskIndex -lt $taskCount; $taskIndex++) {
    $taskOffset = $taskIndex * $taskChunkSize
    $taskPart = $Key.Substring($taskOffset, [Math]::Min($taskChunkSize, $Key.Length - $taskOffset))
    $taskPartNumber = $taskIndex + 1
    $taskLines.Add("VITE_CLOUDBASE_PUBLISHABLE_KEY_PART_${taskPartNumber}=$taskPart")
    $taskLines.Add("CLOUDBASE_PUBLISHABLE_KEY_PART_${taskPartNumber}=$taskPart")
    $taskLengths.Add($taskPart.Length)
}
if ($CheckOnly) {
    [PSCustomObject]@{ Parts = $taskCount; Lengths = @($taskLengths); Total = $Key.Length } | ConvertTo-Json -Compress
} else {
    Set-Clipboard -Value ($taskLines -join "`r`n")
    Write-Host "Copied $($taskCount * 2) variable lines to clipboard; $taskCount parts per side, at most 900 bytes each."
    Write-Host 'Paste/import them into EdgeOne environment variables. Remove both old unsplit KEY variables first, then redeploy.'
}
$Key = $null
$taskPart = $null
$taskPayload = $null
$taskLines.Clear()
