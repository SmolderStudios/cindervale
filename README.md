# Cindervale Idle

A dark-fantasy idle/incremental RPG.

**Status:** In active development
**Studio:** SmolderStudios
**Play:** <https://smolderstudios.github.io/cindervale/>

## Playing the game

Cindervale Idle is distributed as a packaged Electron application. See [our discord](https://discord.gg/Z8kZjzgxWt) for updates and news. Also check out [our website](https://cindervaleidle.com)

## The rename

The game was called *Embervale Idle* until v0.9.14, when an unrelated
[Embervale](https://store.steampowered.com/app/2364430/Embervale/) — also an idle RPG —
turned up on Steam. The rename went all the way down: repo, Pages URL, game filename,
localStorage keys, Electron userData folder, and installer `appId`.

That was a deliberate save wipe, taken while the only players were beta testers.

**Anyone still running an Embervale-era build must reinstall.** GitHub does not redirect
Pages when a repository is renamed, so `smolderstudios.github.io/embervale/` now returns
404. Old wrappers poll that URL on launch, fail silently, and fall back to their cached
copy forever — they have no way to discover the new address.

These identifiers are now frozen. Changing any of them again either wipes saves or
strands installed copies:

- `https://smolderstudios.github.io/cindervale/` — the update endpoint every wrapper polls
- `cindervale_save_v1`, `cindervale_device_id` — localStorage keys holding every save
- `app.setName('cindervale-idle')` — decides `%APPDATA%/cindervale-idle`
- `appId: com.smolderstudios.cindervaleidle` — change it and NSIS installs a second app
  rather than upgrading in place

## License

All rights reserved. See LICENSE.
