[CmdletBinding()]
param(
    [string]$AppUrl = 'https://system-petflow-production.up.railway.app',
    [string]$SdkPath = "$env:LOCALAPPDATA\Android\Sdk",
    [string]$JavaHome = 'C:\Program Files\Android\Android Studio\jbr'
)

$ErrorActionPreference = 'Stop'
$androidRoot = $PSScriptRoot
$projectRoot = Split-Path -Parent $androidRoot
$destination = Join-Path $projectRoot 'dist'
$buildRoot = Join-Path $androidRoot 'build'
$work = Join-Path $buildRoot ([Guid]::NewGuid().ToString('N'))
$store = [Uri]$AppUrl
if ($store.Scheme -ne 'https' -or -not $store.Host -or $store.UserInfo -or $store.Query -or $store.Fragment -or $store.AbsolutePath -ne '/' -or -not $store.IsDefaultPort) {
    throw 'AppUrl deve ser a origem HTTPS da loja, sem caminho, credenciais ou parâmetros.'
}
$AppUrl = $store.GetLeftPart([UriPartial]::Authority)
$sdkPlatform = Get-ChildItem -LiteralPath (Join-Path $SdkPath 'platforms') -Directory |
    Where-Object { $_.Name -match '^android-(\d+)$' -and [int]$Matches[1] -ge 36 } |
    Sort-Object { [int]($_.Name -replace 'android-', '') } -Descending | Select-Object -First 1
$buildTools = Get-ChildItem -LiteralPath (Join-Path $SdkPath 'build-tools') -Directory |
    Where-Object { $_.Name -match '^\d+\.\d+\.\d+$' } |
    Sort-Object { [version]$_.Name } -Descending | Select-Object -First 1
if (-not $sdkPlatform -or -not $buildTools) { throw 'Instale uma plataforma Android 36+ e Android SDK Build-Tools.' }
$androidJar = Join-Path $sdkPlatform.FullName 'android.jar'
$javac = Join-Path $JavaHome 'bin\javac.exe'
$java = Join-Path $JavaHome 'bin\java.exe'
$jar = Join-Path $JavaHome 'bin\jar.exe'
$keytool = Join-Path $JavaHome 'bin\keytool.exe'
$aapt2 = Join-Path $buildTools.FullName 'aapt2.exe'
$zipalign = Join-Path $buildTools.FullName 'zipalign.exe'
$d8jar = Join-Path $buildTools.FullName 'lib\d8.jar'
$signerJar = Join-Path $buildTools.FullName 'lib\apksigner.jar'
$lambdaStubs = Join-Path $buildTools.FullName 'core-lambda-stubs.jar'
foreach ($required in @($androidJar, $javac, $java, $jar, $keytool, $aapt2, $zipalign, $d8jar, $signerJar, $lambdaStubs)) {
    if (-not (Test-Path -LiteralPath $required)) { throw "Ferramenta não encontrada: $required" }
}
function Invoke-BuildTool([string]$Tool, [string[]]$ToolArguments) {
    & $Tool @ToolArguments
    if ($LASTEXITCODE -ne 0) { throw "Falha na ferramenta $Tool (código $LASTEXITCODE)." }
}
$generated = Join-Path $work 'generated'
$classes = Join-Path $work 'classes'
$dex = Join-Path $work 'dex'
$assets = Join-Path $work 'assets'
$webAssets = Join-Path $assets 'web'
foreach ($folder in @($destination, $work, $generated, $classes, $dex, $webAssets)) {
    New-Item -ItemType Directory -Path $folder -Force | Out-Null
}

# An explicit allowlist keeps private environment files and server data out of the APK.
$bundledFiles = [ordered]@{
    'android/web/login.html' = 'login.html'
    'android/web/css/pages/public-login.css' = 'css/pages/public-login.css'
    'android/web/css/pages/android-login.css' = 'css/pages/android-login.css'
    'android/web/js/pages/auth/public-auth.js' = 'js/pages/auth/public-auth.js'
    'android/web/js/pages/home/catalog.js' = 'js/pages/home/catalog.js'
    'android/web/js/layout/android-navigation.js' = 'js/layout/android-navigation.js'
    'android/web/css/layout/android-navigation.css' = 'css/layout/android-navigation.css'
    'public/js/legal/site-privacy.js' = 'js/legal/site-privacy.js'
    'public/css/components/site-privacy.css' = 'css/components/site-privacy.css'
    'public/images/logo/fred-petflow-logo-transparent.png' = 'images/logo/fred-petflow-logo-transparent.png'
    'public/favicon.ico' = 'favicon.ico'
}
foreach ($item in $bundledFiles.GetEnumerator()) {
    $source = Join-Path $projectRoot $item.Key
    $target = Join-Path $webAssets $item.Value
    if (-not (Test-Path -LiteralPath $source)) { throw "Arquivo do login ausente: $($item.Key)" }
    New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
    Copy-Item -LiteralPath $source -Destination $target
}
$buildConfigDirectory = Join-Path $generated 'br\com\petflow\app'
New-Item -ItemType Directory -Path $buildConfigDirectory -Force | Out-Null
$urlLiteral = ConvertTo-Json -InputObject $AppUrl -Compress
[IO.File]::WriteAllText((Join-Path $buildConfigDirectory 'BuildConfig.java'),
    ('package br.com.petflow.app; final class BuildConfig { static final String STORE_URL = ' + $urlLiteral + '; }'),
    [Text.UTF8Encoding]::new($false))
$compiledResources = Join-Path $work 'resources.zip'
$unsigned = Join-Path $work 'unsigned.apk'
Invoke-BuildTool $aapt2 @('compile', '--dir', (Join-Path $androidRoot 'res'), '-o', $compiledResources)
Invoke-BuildTool $aapt2 @('link', '-o', $unsigned, '-I', $androidJar,
    '--manifest', (Join-Path $androidRoot 'AndroidManifest.xml'), '--java', $generated,
    '--min-sdk-version', '26', '--target-sdk-version', '36', '-A', $assets, $compiledResources)
$sourceFiles = @((Get-ChildItem -LiteralPath (Join-Path $androidRoot 'src') -Recurse -Filter '*.java').FullName) +
    @((Get-ChildItem -LiteralPath $generated -Recurse -Filter '*.java').FullName)
Invoke-BuildTool $javac (@('-encoding', 'UTF-8', '-source', '8', '-target', '8', '-bootclasspath', ($androidJar + [IO.Path]::PathSeparator + $lambdaStubs),
    '-classpath', $androidJar, '-d', $classes) + $sourceFiles)
$classesJar = Join-Path $work 'classes.jar'
Invoke-BuildTool $jar @('cf', $classesJar, '-C', $classes, '.')
Invoke-BuildTool $java @('-cp', $d8jar, 'com.android.tools.r8.D8', '--min-api', '26', '--lib', $androidJar, '--output', $dex, $classesJar)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$apkArchive = [IO.Compression.ZipFile]::Open($unsigned, [IO.Compression.ZipArchiveMode]::Update)
try {
    # Some Windows aapt2 versions use backslashes in asset entry names. Android
    # AssetManager expects ZIP paths with '/', independent of the build host.
    foreach ($entry in @($apkArchive.Entries | Where-Object { $_.FullName.Contains('\') })) {
        $normalizedName = $entry.FullName.Replace('\', '/')
        if ($apkArchive.GetEntry($normalizedName)) { throw "Entrada duplicada no APK: $normalizedName" }
        $entryBytes = [IO.MemoryStream]::new()
        try {
            $entryReader = $entry.Open()
            try { $entryReader.CopyTo($entryBytes) } finally { $entryReader.Dispose() }
            $normalizedEntry = $apkArchive.CreateEntry($normalizedName, [IO.Compression.CompressionLevel]::Optimal)
            $entryWriter = $normalizedEntry.Open()
            try {
                $entryBytes.Position = 0
                $entryBytes.CopyTo($entryWriter)
            } finally { $entryWriter.Dispose() }
            $entry.Delete()
        } finally { $entryBytes.Dispose() }
    }
    foreach ($dexFile in Get-ChildItem -LiteralPath $dex -Filter '*.dex') {
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($apkArchive, $dexFile.FullName, $dexFile.Name) | Out-Null
    }
} finally { $apkArchive.Dispose() }
$validatedArchive = [IO.Compression.ZipFile]::OpenRead($unsigned)
try {
    if (@($validatedArchive.Entries | Where-Object { $_.FullName.Contains('\') }).Count -ne 0) {
        throw 'O APK ainda contém caminhos ZIP incompatíveis com Android.'
    }
    $packagedAssets = @($validatedArchive.Entries | Where-Object { $_.FullName.StartsWith('assets/web/') -and -not $_.FullName.EndsWith('/') })
    if ($packagedAssets.Count -ne $bundledFiles.Count) { throw 'A quantidade de arquivos do login no APK está incorreta.' }
    foreach ($item in $bundledFiles.GetEnumerator()) {
        $assetName = 'assets/web/' + $item.Value.Replace('\', '/')
        $assetEntry = $validatedArchive.GetEntry($assetName)
        if (-not $assetEntry) { throw "Arquivo ausente no APK: $assetName" }
        $assetStream = $assetEntry.Open()
        $digest = [Security.Cryptography.SHA256]::Create()
        try {
            $assetHash = [BitConverter]::ToString($digest.ComputeHash($assetStream)).Replace('-', '')
        } finally {
            $assetStream.Dispose()
            $digest.Dispose()
        }
        $sourceHash = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $projectRoot $item.Key)).Hash
        if ($assetHash -ne $sourceHash) { throw "Conteúdo do login divergente no APK: $assetName" }
    }
    Write-Output "Login empacotado: $($packagedAssets.Count) arquivos com caminhos e SHA-256 verificados."
} finally { $validatedArchive.Dispose() }
$aligned = Join-Path $work 'aligned.apk'
Invoke-BuildTool $zipalign @('-f', '-p', '4', $unsigned, $aligned)
$keystore = Join-Path $buildRoot 'petflow-debug.keystore'
if (-not (Test-Path -LiteralPath $keystore)) {
    Invoke-BuildTool $keytool @('-genkeypair', '-keystore', $keystore, '-storepass', 'android', '-keypass', 'android',
        '-alias', 'petflow-debug', '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000',
        '-dname', 'CN=PetFlow Android Development, O=PetFlow, C=BR', '-noprompt')
}
$finalApk = Join-Path $destination 'PetFlow-Android.apk'
Invoke-BuildTool $java @('-jar', $signerJar, 'sign', '--ks', $keystore, '--ks-key-alias', 'petflow-debug',
    '--ks-pass', 'pass:android', '--key-pass', 'pass:android', '--out', $finalApk, $aligned)
Invoke-BuildTool $java @('-jar', $signerJar, 'verify', '--verbose', $finalApk)
Invoke-BuildTool $zipalign @('-c', '4', $finalApk)
$hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $finalApk).Hash.ToLowerInvariant()
Set-Content -LiteralPath (Join-Path $destination 'PetFlow-Android.apk.sha256') -Encoding ascii -Value ($hash + '  PetFlow-Android.apk')
Write-Output "APK: $finalApk"
Write-Output "Loja: $AppUrl"
Write-Output "SHA-256: $hash"
