# luci-theme-tp
A Legacy-style theme for OpenWrt's LuCI interface, **just for fun**.

It is not intended to be used as a production theme, and may contain bugs and incomplete features. Use it at your own risk.

## Features

- Classic TP-Link-styled header, sidebar and content layout
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

Theme assets were trimmed from ~880 KB to under 60 KB:

| Asset | Before | After |
| --- | --- | --- |
| Header banner | `header.png` (875 KB) | `header.webp` (55 KB, same resolution, q82) |
| Favicon | full-size banner image | dedicated 2 KB `favicon.png` |

The header banner is lazy-loaded (`data-src`) and only fetched when the logo
display mode needs it, so it costs nothing on normal page loads.

## License

Apache-2.0 (see `Makefile`).
