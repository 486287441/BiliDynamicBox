# Sync landing page + static assets to gh-pages (root index.html = privacy policy, unchanged).
$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$Worktree = Join-Path $env:TEMP "BiliDynamicBox-gh-pages"

function Copy-ItemForce($src, $dst) {
  $parent = Split-Path $dst -Parent
  if ($parent -and -not (Test-Path $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }
  Copy-Item -Path $src -Destination $dst -Force
}

Push-Location $RepoRoot
try {
  if (Test-Path $Worktree) {
    git worktree remove --force $Worktree 2>$null
  }
  git worktree add $Worktree gh-pages

  $pagesRoot = $Worktree
  Copy-ItemForce (Join-Path $RepoRoot "landing\index.html") (Join-Path $pagesRoot "landing\index.html")
  Copy-ItemForce (Join-Path $RepoRoot "assets\screenshots\inbox-1280x800-contain.png") (Join-Path $pagesRoot "assets\screenshots\inbox-1280x800-contain.png")
  Copy-ItemForce (Join-Path $RepoRoot "assets\screenshots\trash-modal-1280x800-contain.png") (Join-Path $pagesRoot "assets\screenshots\trash-modal-1280x800-contain.png")
  foreach ($icon in @("icon16.png", "icon48.png", "icon128.png")) {
    Copy-ItemForce (Join-Path $RepoRoot "extension\icons\$icon") (Join-Path $pagesRoot "extension\icons\$icon")
  }

  Push-Location $Worktree
  try {
    git add landing assets extension
    $status = git status --porcelain
    if (-not $status) {
      Write-Host "gh-pages: nothing to commit (already up to date)."
    } else {
      git commit -m "pages: add product landing at /landing/"
      git push origin gh-pages
      Write-Host "Deployed. Privacy: https://486287441.github.io/BiliDynamicBox/"
      Write-Host "Landing:    https://486287441.github.io/BiliDynamicBox/landing/"
    }
  } finally {
    Pop-Location
  }
} finally {
  Pop-Location
  if (Test-Path $Worktree) {
    Push-Location $RepoRoot
    git worktree remove --force $Worktree 2>$null
    Pop-Location
  }
}
