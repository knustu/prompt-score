param(
  [string]$OutputPath = (Join-Path $PSScriptRoot '..\public\images\tarot')
)

Add-Type -AssemblyName System.Drawing

$cards = @()
foreach ($index in 0..21) {
  $cards += [pscustomobject]@{ id = "major-{0:D2}" -f $index; arcana = 'major' }
}

$ranks = @('ace', '02', '03', '04', '05', '06', '07', '08', '09', '10', 'page', 'knight', 'queen', 'king')
foreach ($suit in @('wands', 'cups', 'swords', 'pentacles')) {
  foreach ($rank in $ranks) {
    $cards += [pscustomobject]@{ id = "$suit-$rank"; arcana = $suit }
  }
}

$palette = @{
  major = [System.Drawing.Color]::FromArgb(226, 190, 255)
  wands = [System.Drawing.Color]::FromArgb(255, 200, 142)
  cups = [System.Drawing.Color]::FromArgb(144, 232, 255)
  swords = [System.Drawing.Color]::FromArgb(201, 213, 255)
  pentacles = [System.Drawing.Color]::FromArgb(185, 245, 186)
}
$symbols = @{ major = '✦'; wands = '◇'; cups = '◒'; swords = '⚔'; pentacles = '⬡' }
$labels = @{ major = 'MAJOR ARCANA'; wands = 'ACTION NODE'; cups = 'EMOTION FIELD'; swords = 'LOGIC MATRIX'; pentacles = 'RESOURCE GRID' }

New-Item -ItemType Directory -Force -Path $OutputPath | Out-Null
$center = [System.Drawing.StringFormat]::new()
$center.Alignment = [System.Drawing.StringAlignment]::Center
$center.LineAlignment = [System.Drawing.StringAlignment]::Center

for ($index = 0; $index -lt $cards.Count; $index += 1) {
  $card = $cards[$index]
  $accent = $palette[$card.arcana]
  $dark = [System.Drawing.Color]::FromArgb(8 + ($index % 5), 13 + ($index % 8), 34 + ($index % 13))
  $deep = [System.Drawing.Color]::FromArgb(13, 10 + ($index % 9), 45 + ($index % 17))
  $bitmap = [System.Drawing.Bitmap]::new(260, 390)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $backgroundRect = [System.Drawing.Rectangle]::new(0, 0, 260, 390)
  $background = [System.Drawing.Drawing2D.LinearGradientBrush]::new($backgroundRect, $dark, $deep, 35)
  $graphics.FillRectangle($background, $backgroundRect)

  $gridPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(28, $accent.R, $accent.G, $accent.B), 1)
  for ($line = 28; $line -lt 390; $line += 28) { $graphics.DrawLine($gridPen, 0, $line, 260, $line) }
  for ($line = 18; $line -lt 260; $line += 36) { $graphics.DrawLine($gridPen, $line, 0, $line, 390) }

  $borderPen = [System.Drawing.Pen]::new($accent, 2)
  $innerPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(110, $accent.R, $accent.G, $accent.B), 1)
  $graphics.DrawRectangle($borderPen, 7, 7, 246, 376)
  $graphics.DrawRectangle($innerPen, 14, 14, 232, 362)

  $orbitalPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(105, $accent.R, $accent.G, $accent.B), 1)
  $graphics.DrawEllipse($orbitalPen, 46, 104, 168, 168)
  $graphics.DrawEllipse($orbitalPen, 66, 124, 128, 128)
  $graphics.DrawEllipse([System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(95, 85, 242, 255), 1), 83, 141, 94, 94)
  $dotBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(210, 85, 242, 255))
  $graphics.FillEllipse($dotBrush, 204, 83, 6, 6)
  $graphics.FillEllipse($dotBrush, 43, 286, 5, 5)

  $accentBrush = [System.Drawing.SolidBrush]::new($accent)
  $mutedBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(155, 171, 202, 218))
  $cyanBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(220, 85, 242, 255))
  $titleFont = [System.Drawing.Font]::new('Segoe UI', 9, [System.Drawing.FontStyle]::Bold)
  $nodeFont = [System.Drawing.Font]::new('Segoe UI', 8, [System.Drawing.FontStyle]::Bold)
  $symbolFont = [System.Drawing.Font]::new('Segoe UI Symbol', 52, [System.Drawing.FontStyle]::Regular)
  $smallFont = [System.Drawing.Font]::new('Segoe UI', 7, [System.Drawing.FontStyle]::Bold)
  $graphics.DrawString('NEURAL ARCANA', $titleFont, $accentBrush, [System.Drawing.RectangleF]::new(18, 24, 224, 20), $center)
  $graphics.DrawString(('NODE {0:D2} / 78' -f ($index + 1)), $nodeFont, $cyanBrush, [System.Drawing.RectangleF]::new(18, 47, 224, 18), $center)
  $graphics.DrawString($symbols[$card.arcana], $symbolFont, $accentBrush, [System.Drawing.RectangleF]::new(58, 143, 144, 92), $center)
  $graphics.DrawString($labels[$card.arcana], $smallFont, $mutedBrush, [System.Drawing.RectangleF]::new(20, 287, 220, 18), $center)
  $graphics.DrawString($card.id.ToUpperInvariant(), $smallFont, $accentBrush, [System.Drawing.RectangleF]::new(20, 311, 220, 18), $center)
  $graphics.DrawString('AI / SYMBOLIC SYSTEM', $smallFont, $mutedBrush, [System.Drawing.RectangleF]::new(20, 350, 220, 18), $center)

  $filePath = Join-Path $OutputPath "$($card.id).png"
  $bitmap.Save($filePath, [System.Drawing.Imaging.ImageFormat]::Png)

  $smallFont.Dispose(); $symbolFont.Dispose(); $nodeFont.Dispose(); $titleFont.Dispose()
  $cyanBrush.Dispose(); $mutedBrush.Dispose(); $accentBrush.Dispose(); $dotBrush.Dispose()
  $orbitalPen.Dispose(); $innerPen.Dispose(); $borderPen.Dispose(); $gridPen.Dispose(); $background.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
}

$center.Dispose()
Write-Output "Generated $($cards.Count) tarot assets in $OutputPath"
