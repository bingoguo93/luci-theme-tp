'use strict';
'require baseclass';

/*
 * Decorate DHCP lease tables with a small brand icon next to each hostname,
 * and drop the Interface/DUID columns so the v4 and v6 lease tables line up.
 *
 * A row is treated as a lease row when one of its cells holds a MAC address
 * (6 octets) or a longer client id such as a DHCPv6 DUID. The brand is
 * guessed from the MAC OUI first, then from hostname keywords; unknown
 * devices get the fallback glyph. Matching is best effort - wrong guesses
 * are harmless, the icon is decorative only.
 *
 * Columns are located via the table header (locale aware, English and
 * Chinese), never by fixed index, so both the 24.10 and the newer layouts
 * (which prepend an Interface column) work. Column removal only happens in
 * lease tables.
 */

return baseclass.extend({
	__init__() {
		/* approximate OUI prefixes per brand - extend as needed */
		this.brands = [
			{ icon: '🍎', name: 'Apple', oui: [ 'f0:18:98', 'a4:83:e7', '3c:07:54', '78:7b:8a', 'dc:2b:2a', '88:e9:fe', '04:0c:ce', '28:cf:e9' ] },
			{ icon: '📱', name: 'Samsung', oui: [ '00:07:ab', '00:12:fb', '5c:0a:5b', '78:25:ad' ] },
			{ icon: '📱', name: 'Xiaomi', oui: [ '28:6c:07', '64:09:80', '78:11:dc', 'f8:8f:ca' ] },
			{ icon: '📱', name: 'Huawei', oui: [ '00:e0:fc', '04:bd:70', '24:db:ac', '48:46:fb' ] },
			{ icon: '📱', name: 'Google', oui: [ '3c:28:6d', '54:60:09', 'f4:f5:e8', '94:eb:2c' ] },
			{ icon: '🪟', name: 'Microsoft', oui: [ '00:03:ff', '00:0d:3a', '00:12:5a', '28:18:78', 'dc:b4:c4' ] },
			{ icon: '🎮', name: 'Sony', oui: [ '00:04:1f', '00:13:a9', '00:1a:80', '04:5d:4b' ] },
			{ icon: '🎮', name: 'Nintendo', oui: [ '98:b6:e9', '8c:cd:e8', 'e0:0c:7f', '40:f4:07' ] },
			{ icon: '🍓', name: 'Raspberry Pi', oui: [ 'b8:27:eb', 'dc:a6:32', 'e4:5f:01', 'd8:3a:dd' ] },
			{ icon: '📟', name: 'Espressif', oui: [ '24:0a:c4', '30:ae:a4', '3c:61:05', '84:cc:a8' ] },
			{ icon: '🌐', name: 'TP-Link', oui: [ '14:cc:20', '50:c7:bf', '60:32:b1', '98:da:c4' ] },
			{ icon: '🌐', name: 'Netgear', oui: [ '00:09:5b', '00:14:6c', '20:4e:7f', '9c:3d:cf' ] },
			{ icon: '🌐', name: 'Ubiquiti', oui: [ '04:18:d6', '24:5a:4c', '44:d9:e7', '74:ac:b9' ] },
			{ icon: '💻', name: 'Intel', oui: [ '00:1b:21', '3c:97:0e', '5c:51:4f', 'a0:c5:89' ] },
			{ icon: '💾', name: 'Synology', oui: [ '00:11:32', '90:09:d0' ] },
			{ icon: '💾', name: 'QNAP', oui: [ '00:08:9b', '24:5e:be' ] }
		];

		this.oui = {};

		for (const brand of this.brands)
			for (const prefix of brand.oui)
				this.oui[prefix] = brand;

		/* hostname keyword heuristics - first match wins */
		this.patterns = [
			[ /iphone|ipad|ipod|macbook|imac|mac[-_ ]|apple/, '🍎', 'Apple' ],
			[ /android|pixel|galaxy|oneplus|oppo|vivo|redmi|poco|xiaomi|huawei|honor|realme|tecno|infinix/, '📱', 'Phone' ],
			[ /desktop|surface|windows|win[-_ ]/, '🪟', 'Windows PC' ],
			[ /thinkpad|dell|lenovo|hp[-_ ]|asus|acer|msi|laptop|notebook|\bnuc\b/, '💻', 'Laptop' ],
			[ /nas|synology|qnap|diskstation|truenas|openmedia|unraid/, '💾', 'NAS' ],
			[ /appletv|chromecast|firetv|roku|smart[-_ ]?tv|mi[-_ ]?tv|shield|television/, '📺', 'TV' ],
			[ /print|officejet|laserjet|deskjet|epson|canon|brother|xerox/, '🖨️', 'Printer' ],
			[ /camera|cam[-_ ]|\bipc\b|hik|dahua|reolink|ezviz|wyze|blink|ring/, '📷', 'Camera' ],
			[ /watch|band|fitbit|garmin/, '⌚', 'Wearable' ],
			[ /esp\d|tasmota|shelly|sonoff|zigbee|mqtt|iot|sensor|plug|bulb|lamp|kasa|tuya/, '📟', 'IoT device' ],
			[ /\bap\b|router|gateway|mesh|repeater|openwrt|modem|\bcpe\b/, '🌐', 'Network device' ],
			[ /speaker|alexa|homepod|sonos|echo/, '🔊', 'Speaker' ],
			[ /xbox|playstation|ps[345]|nintendo|switch|steam|game/, '🎮', 'Console' ],
			[ /server|proxmox|esxi|ubuntu|debian|linux|fedora|docker|vm[-_ ]/, '🖥️', 'Server' ],
			[ /phone|voip|\bsip\b|ip[-_ ]?phone/, '📱', 'Phone' ]
		];

		this.fallback = { icon: '🧩', name: _('Unknown device') };

		this.timer = null;
		this.decorate();

		new MutationObserver(() => {
			/* lease rows are rebuilt on every poll - redecorate, debounced */
			if (this.timer)
				return;

			this.timer = setTimeout(() => {
				this.timer = null;
				this.decorate();
			}, 300);
		}).observe(document.body, { childList: true, subtree: true });
	},

	/* client id cell: MAC (6 octets) or longer ids like DHCPv6 DUIDs */
	findClientId(cells) {
		for (const cell of cells) {
			/* a cell holding form controls is an edit row, not a lease row */
			if (cell.querySelector && cell.querySelector('input, textarea, select'))
				return null;

			const text = (cell.textContent || '').trim().toUpperCase();

			if (/^([0-9A-F]{2}[:-]){5,}[0-9A-F]{2}$/.test(text))
				return text;
		}

		return null;
	},

	/*
	 * Column map for a lease table, derived from the header row and cached
	 * on the element (the header is only intact before the first trim):
	 *   host - index of the hostname column (-1 when not found)
	 *   drop - indexes of the Interface/DUID columns to remove
	 */
	tableMap(table) {
		let host = table.getAttribute('data-tp-host');
		let drop = table.getAttribute('data-tp-drop');

		if (host === null || drop === null) {
			const header = (table.rows && table.rows[0])
				? Array.from(table.rows[0].cells || []) : [];
			const dropIdx = [];
			let hostIdx = -1;

			header.forEach((cell, i) => {
				const text = (cell.textContent || '').trim();

				if (/^(interface|接口)$/i.test(text) || /^duid$/i.test(text))
					dropIdx.push(i);
				else if (hostIdx < 0 && /^(hostname|host|主机名|主机)$/i.test(text))
					hostIdx = i;
			});

			host = String(hostIdx);
			drop = dropIdx.join(',');
			table.setAttribute('data-tp-host', host);
			table.setAttribute('data-tp-drop', drop);
		}

		return {
			host: parseInt(host, 10),
			drop: drop ? drop.split(',').map(Number) : []
		};
	},

	/* remove the cached Interface/DUID column indexes from every row */
	trimColumns(table, drop) {
		for (const row of Array.from(table.rows || [])) {
			if (row.hasAttribute('data-tp-trimmed'))
				continue;

			/* descending: row.cells is live and shifts on removal */
			for (let i = drop.length - 1; i >= 0; i--) {
				const cell = row.cells && row.cells[drop[i]];

				if (cell && cell.remove)
					cell.remove();
			}

			row.setAttribute('data-tp-trimmed', '1');
		}
	},

	brandFor(id, hostname) {
		const prefix = id.toLowerCase().replace(/-/g, ':').slice(0, 8);

		if (this.oui[prefix])
			return this.oui[prefix];

		const name = String(hostname || '').toLowerCase();

		for (const [re, icon, brand] of this.patterns)
			if (re.test(name))
				return { icon, name: brand };

		return this.fallback;
	},

	decorate() {
		for (const table of document.querySelectorAll('table')) {
			const map = this.tableMap(table);
			const rows = table.rows ? Array.from(table.rows)
				: Array.from(table.querySelectorAll('.tr'));

			for (const row of rows) {
				if (row.hasAttribute('data-tp-brand'))
					continue;

				/* rows containing form controls are edit rows (e.g. static
				   leases), not lease listings - leave them alone */
				if (row.querySelector && row.querySelector('input, textarea, select'))
					continue;

				const cells = row.cells ? Array.from(row.cells)
					: Array.from(row.querySelectorAll('.td'));

				if (cells.length < 2)
					continue;

				const id = this.findClientId(cells);

				if (!id)
					continue;

				row.setAttribute('data-tp-brand', '1');
				/* hook for user CSS; the theme itself does not style it */
				table.classList.add('tp-lease-table');

				const hostCell = cells[map.host] || cells[0];
				const hostname = (hostCell.textContent || '')
					.replace(/\s*\(.*\)\s*$/, '').trim();
				const brand = this.brandFor(id, hostname);
				const icon = document.createElement('span');

				icon.className = 'lease-ico';
				icon.setAttribute('aria-hidden', 'true');
				icon.title = brand.name;
				icon.textContent = brand.icon;

				hostCell.insertBefore(icon, hostCell.firstChild);
			}

			/* Interface/DUID columns only go in lease tables - other tables
			   (routes, firewall, ...) legitimately have an Interface column */
			if (map.drop.length &&
				(table.classList.contains('tp-lease-table') ||
					/^status_leases/.test(table.id || '')))
				this.trimColumns(table, map.drop);
		}
	}
});
