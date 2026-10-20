# luci-theme-tp
A Legacy-style theme for OpenWrt's LuCI interface, **just for fun**.

It is not intended to be used as a production theme, and may contain bugs and incomplete features. Use it at your own risk.

The look is inspired by classic router admin pages. It is not affiliated with
or endorsed by TP-Link; no TP-Link logos or artwork are included.

Authentication plugins may inject HTML into the login form (`auth_html`,
`auth_message`, `auth_assets`); like LuCI itself, the theme treats
admin-installed plugins as trusted code.

## Features

- Classic retro-router-styled header, sidebar and content layout
- Responsive design with touch-friendly targets on small screens
- Automatic dark mode via `prefers-color-scheme` (content images are toned down, logo and UI icons stay untouched)
- Live CPU temperature indicator in the header (warn/danger coloring at 65 °C / 80 °C)
- Optional logo display mode, toggled by clicking the brand in the header (persisted in `localStorage`)
- Lightweight: no external JS frameworks beyond LuCI's own `luci-base` modules

## Installation

### From release packages

Download the `.ipk`/`.apk` for your architecture from the
[Releases](https://github.com/bingoguo93/luci-theme-tp/releases) page and install it:

```sh
opkg install luci-theme-tp_*.ipk
```

Then select the theme in LuCI under *System → System → Language and Style*.

### Building inside OpenWrt

Add the repository to your feeds or clone it into `package/`:

```sh
git clone https://github.com/bingoguo93/luci-theme-tp.git package/luci-theme-tp
make menuconfig   # select LuCI -> Themes -> luci-theme-tp
make package/luci-theme-tp/compile
```

## Asset size

Theme assets stay tiny (well under 10 KB):

| Asset | Before | After |
| --- | --- | --- |
| Header banner | `header.webp` (55 KB stock art) | flat CSS background (0 KB) |
| Brand wordmark | stock logo (2.7 KB) | custom `logo.svg` (0.5 KB) |
| Favicon | full-size banner image | dedicated 0.7 KB `favicon.png` |

The brand logo is lazy-loaded (`data-src`) and only fetched when the logo
display mode needs it, so it costs nothing on normal page loads.

## Development

Static checks (JS syntax, ucode template delimiter pairing, CSS brace
balance, asset and module reference resolution) run as a standalone
`lint` job in CI and can be run locally with:

```sh
node scripts/lint.mjs
```

## License

Apache-2.0 (see `LICENSE`).
