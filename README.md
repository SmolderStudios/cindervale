# Cindervale Idle

A dark-fantasy idle/incremental RPG.

**Status:** In active development
**Studio:** SmolderStudios

## Playing the game

Cindervale Idle is distributed as a packaged Electron application. See [our discord](https://discord.gg/Z8kZjzgxWt) for download.

## Why the repo is still called `embervale`

The repo, the Pages URL, and the save keys all still say `embervale`. That is deliberate.

The game was renamed from *Embervale Idle* to *Cindervale Idle* in v0.9.12, after an
unrelated [Embervale](https://store.steampowered.com/app/2364430/Embervale/) — also an
idle RPG — turned up on Steam. The rename is display-only:

- `https://smolderstudios.github.io/embervale/` is the update endpoint every installed
  copy polls on launch. Renaming the repo would 404 it and permanently freeze
  auto-update for everyone already installed — they have no way to learn a new URL.
- `embervale_save_v2` and `embervale_device_id` are the localStorage keys holding every
  player's save.
- `app.setName('embervale-idle')` decides `%APPDATA%/embervale-idle`, where the Electron
  build keeps its saves.

These are identifiers, not branding. Nobody sees them, and renaming any of them destroys
save data.

## License

All rights reserved. See LICENSE.
