# Ahem

`Ahem.ttf` is the W3C's "Ahem" test font, used only by the visual regression
tests (`tests/visual.test.mjs`). It is **not** part of the published package.

Every glyph is a fixed-size square (units per em 1000, ascent 800, descent 200),
so text lays out identically on every machine regardless of which fonts are
installed. That keeps the screenshots comparable between a developer's computer
and CI.

- Source: https://github.com/web-platform-tests/wpt/blob/master/fonts/Ahem.ttf
  (also https://www.w3.org/Style/CSS/Test/Fonts/Ahem/)
- Authors: Todd Fahrner and Myles C. Maxfield
- Licence: public domain; the font file itself carries a Creative Commons Zero
  (CC0 1.0) waiver for jurisdictions that do not recognise public domain.
