$token = (Get-Content .env | Where-Object { $_ -match '^ADMIN_BOT_TOKEN=' }) -replace '^ADMIN_BOT_TOKEN=',''
$token = $token.Trim()
Write-Host "Token prefix: $($token.Substring(0,[Math]::Min(10,$token.Length)))"

# Check bot info
try {
    $me = Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/getMe"
    Write-Host "Bot: $($me.result.first_name) (@$($me.result.username))"
} catch {
    Write-Host "getMe error: $_"
}

# Check webhook
try {
    $wh = Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/getWebhookInfo"
    Write-Host "Webhook URL: '$($wh.result.url)'"
    Write-Host "Pending: $($wh.result.pending_update_count)"
} catch {
    Write-Host "getWebhookInfo error: $_"
}

# Delete webhook
try {
    $del = Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/deleteWebhook?drop_pending_updates=true"
    Write-Host "deleteWebhook result: $($del.result)"
} catch {
    Write-Host "deleteWebhook error: $_"
}
