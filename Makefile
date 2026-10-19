#
# Copyright (C) 2008-2014 The LuCI Team <luci@lists.subsignal.org>
#
# This is free software, licensed under the Apache License, Version 2.0 .
#

include $(TOPDIR)/rules.mk

LUCI_TITLE:=T-Link Classic Theme
LUCI_DEPENDS:=+luci-base
# bump together with theme_ver in ucode/template/themes/tp/header.ut
# (theme_ver busts browser caches; PKG_VERSION versions the package)
PKG_VERSION:=1.0.0
PKG_LICENSE:=Apache-2.0

define Package/luci-theme-tp/postrm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	# if this theme is still the active one, fall back to a bundled theme
	# so LuCI is not left pointing at files we just removed
	[ "$$(uci -q get luci.main.mediaurlbase)" = "/luci-static/tp" ] && {
		if [ -d /www/luci-static/bootstrap ]; then
			uci set luci.main.mediaurlbase=/luci-static/bootstrap
		else
			uci -q delete luci.main.mediaurlbase
		fi
	}
	uci -q delete luci.themes.TPLink
	uci commit luci
}
endef

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
