# SET JAVA_HOME Script for Windows
# Run this script if Java is installed but JAVA_HOME is not set

Write-Host "Searching for Java installations..." -ForegroundColor Cyan

# Common JDK installation paths
$jdkPaths = @(
    "C:\Program Files\Java\jdk-17*",
    "C:\Program Files\Java\jdk-11*",
    "C:\Program Files\Java\jdk*",
    "C:\Program Files\Eclipse Adoptium\jdk-17*",
    "C:\Program Files\Eclipse Adoptium\jdk*",
    "C:\Program Files\Microsoft\jdk-17*",
    "C:\Program Files\OpenJDK\jdk-17*"
)

$foundJdk = $null
foreach ($pattern in $jdkPaths) {
    $found = Get-Item $pattern -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        $foundJdk = $found.FullName
        break
    }
}

if ($foundJdk) {
    Write-Host "`nFound JDK at: $foundJdk" -ForegroundColor Green
    
    # Set for current session
    $env:JAVA_HOME = $foundJdk
    $env:PATH = "$foundJdk\bin;$env:PATH"
    
    Write-Host "`nJAVA_HOME set for current session: $env:JAVA_HOME" -ForegroundColor Green
    Write-Host "`nTo set permanently (requires admin):" -ForegroundColor Yellow
    Write-Host "  1. Open System Properties > Advanced > Environment Variables" -ForegroundColor White
    Write-Host "  2. Add System Variable: JAVA_HOME = $foundJdk" -ForegroundColor White
    Write-Host "  3. Edit PATH variable and add: %JAVA_HOME%\bin" -ForegroundColor White
    
    Write-Host "`nVerifying Java setup..." -ForegroundColor Cyan
    java -version
    
    Write-Host "`n✅ Ready to build! Run: .\gradlew assembleDebug" -ForegroundColor Green
    
} else {
    Write-Host "`n❌ No JDK found in common locations." -ForegroundColor Red
    Write-Host "Please install JDK 17 from:" -ForegroundColor Yellow
    Write-Host "  https://adoptium.net/temurin/releases/?version=17" -ForegroundColor Cyan
}
