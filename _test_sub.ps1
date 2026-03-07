$body = @{
    customerName = "Test User"
    phoneNumber = "9876543210"
    address = "Test Address"
    pincode = "313001"
    productId = "d71675fd-049d-4489-ade4-90094b94427c"
    productName = "Atta"
    quantity = 1
    frequency = "weekly"
    paymentMethod = "cod"
} | ConvertTo-Json

Write-Host "Sending payload:"
Write-Host $body

try {
    $res = Invoke-RestMethod -Uri "http://localhost/api/subscriptions" -Method POST -ContentType "application/json" -Body $body
    Write-Host "SUCCESS:" ($res | ConvertTo-Json)
} catch {
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $text = $reader.ReadToEnd()
    Write-Host "ERROR STATUS:" $_.Exception.Response.StatusCode
    Write-Host "ERROR BODY:" $text
}
