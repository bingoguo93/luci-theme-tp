'use strict';
'require baseclass';
'require rpc';

return baseclass.extend({
	__init__() {
		/* ubus "file" object (rpcd-mod-file), read-only, path is positional */
		this.readThermal = rpc.declare({
			object: 'file',
			method: 'read',
			params: [ 'path' ],
			expect: { '': {} }
		});

		this.zone = '/sys/class/thermal/thermal_zone0/temp';

		this.refresh();

		setInterval(() => {
			if (!document.hidden)
				this.refresh();
		}, 10000);
	},

	updateTempUI(temp) {
		const el = document.getElementById('temp-indicator');
		const valEl = document.getElementById('temp-value');
		if (!el || !valEl)
			return;

		valEl.textContent = temp.toFixed(1);
		el.style.display = 'flex';

		valEl.classList.remove('warn', 'danger');
		if (temp >= 80)
			valEl.classList.add('danger');
		else if (temp >= 65)
			valEl.classList.add('warn');
	},

	refresh() {
		return this.readThermal(this.zone).then((res) => {
			const raw = (res && res.content) ? parseInt(String(res.content).trim(), 10) : NaN;

			if (isNaN(raw))
				return;

			/* accept both millidegrees and plain degrees */
			this.updateTempUI(raw > 1000 ? raw / 1000 : raw);
		}, () => {
			/* no thermal zone or no ubus access - keep the indicator hidden */
		});
	}
});
