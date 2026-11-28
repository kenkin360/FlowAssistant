@echo off
setlocal DisableDelayedExpansion
pushd "%~dp0" || exit /b 1

REM Run PowerShell code directly. No .ps1 file or permanent policy change is needed.
REM The fixed Chinese heading is UTF-8 Base64 to avoid Windows CMD code-page changes.
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "$files=@('App.tsx','Bundle.js','Resource.js','Function.extend.js'); $missing=@($files | Where-Object { -not (Test-Path -LiteralPath $_ -PathType Leaf) }); if ($missing.Count -gt 0) { [Console]::Error.WriteLine('Missing required files: ' + ($missing -join ', ')); exit 1 }; $lf=[string][char]10; $cr=[string][char]13; $heading=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('6KuL5LiN6KaB5L+u5pS56ICM57K+56K65Lul5oiR5o+Q5L6b55qE56iL5byP56K85pu05paw5qqU5qGI5aaC5LiLOiA=')); $sections=@(foreach ($file in $files) { $language=if ($file -eq 'App.tsx') { 'tsx' } else { 'js' }; $source=[IO.File]::ReadAllText((Join-Path $PWD.Path $file)); $source=$source.Replace($cr+$lf,$lf).Replace($cr,$lf).TrimEnd([char]10); '### File: `' + $file + '`' + $lf + $lf + '```' + $language + $lf + $source + $lf + '```' }); $content=$heading + $lf + $lf + ($sections -join ($lf+$lf)) + $lf + $lf; [IO.File]::WriteAllText((Join-Path $PWD.Path 'update.md'), $content, [Text.UTF8Encoding]::new($false))"
set "result=%errorlevel%"
popd
if not "%result%"=="0" (
	echo Failed to create update.md. 1>&2
)
exit /b %result%
