
$basePath = "C:\Destop\New folder\IT3030-PAF-2026-smart-campus-NUSLIIT_JFN3\backend\src\main\java\com\sliit\smartcampus"
$oldPkgs = @(
    "booking", "booking.waitlist", "event", "facility", "health", 
    "home", "incident", "notification", "resource", "user"
)

$layers = @("controller", "service", "repository", "model", "dto", "util")

# 1. Map ClassName -> NewPackage
$classMap = @{}
$allFiles = Get-ChildItem -Path $basePath -Recurse -Filter *.java
foreach ($file in $allFiles) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match "package ([a-z0-9\.]+);") {
        $pkg = $matches[1]
        $className = $file.BaseName
        $classMap[$className] = $pkg
    }
}

# 2. Clean and Fix
foreach ($file in $allFiles) {
    if ($file.Name -eq "SmartCampusApplication.java") { continue }
    
    $content = Get-Content $file.FullName -Raw
    $currentPkg = ""
    if ($content -match "package ([a-z0-9\.]+);") { $currentPkg = $matches[1] }
    
    # Remove all imports from old feature-based packages
    foreach ($oldPkg in $oldPkgs) {
        $pattern = "import com\.sliit\.smartcampus\." + [regex]::Escape($oldPkg) + "\.[^;]+;"
        $content = $content -replace $pattern, ""
    }
    
    # Remove any stray layer-based imports so we can re-add them cleanly
    foreach ($layer in $layers) {
        $pattern = "import com\.sliit\.smartcampus\." + [regex]::Escape($layer) + "\.[^;]+;"
        $content = $content -replace $pattern, ""
    }

    # Re-add all necessary imports based on class usages
    $newImports = @()
    foreach ($className in $classMap.Keys) {
        $targetPkg = $classMap[$className]
        if ($currentPkg -ne $targetPkg -and $content -match "\b$className\b") {
             $newImports += "import $targetPkg.$className;"
        }
    }
    
    $importBlock = "`r`n" + (($newImports | Sort-Object | Get-Unique) -join "`r`n")
    if ($content -match "package [a-z0-9\.]+;") {
        $content = $content -replace "(package [a-z0-9\.]+;)", "$1$importBlock"
    } else {
        # If no package declaration found, just prepend
        $content = $importBlock + "`r`n" + $content
    }

    # Final cleanup of double newlines
    $content = $content -replace "(`r`n){3,}", "`r`n`r`n"

    Set-Content -Path $file.FullName -Value $content
}
