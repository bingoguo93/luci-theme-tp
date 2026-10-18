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

		/* candidate sources probed in order: SoC thermal zones first, then hwmon chips */
		this.sources = [];
		for (let i = 0; i < 10; i++)
			this.sources.push('/sys/class/thermal/thermal_zone' + i + '/temp');
		for (let h = 0; h < 8; h++)
			for (let t = 1; t <= 4; t++)
				this.sources.push('/sys/class/hwmon/hwmon' + h + '/temp' + t + '_input');

		this.idx = 0;      /* index of the last working source */
		this.skipCycles = 0; /* backoff between full sweeps after every source failed */

		this.refresh();

		setInterval(() => {
			if (!document.hidden)
				this.refresh();
		}, 10000);
	},

	/* accept both millidegrees and plain degrees; reject out-of-range garbage */
	toCelsius(raw) {
		const temp = (raw > 1000 || raw < -1000) ? raw / 1000 : raw;
		return (temp >= -40 && temp <= 150) ? temp : NaN;
	},

	hideTempUI() {
		const el = document.getElementById('temp-indicator');
		if (el)
			el.style.display = 'none';
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
		if (this.skipCycles > 0) {
			this.skipCycles--;
			return Promise.resolve();
		}

		return this.probe(this.idx);
	},

	/* walk the candidate list from index i until one yields a valid reading */
	probe(i) {
		if (i >= this.sources.length) {
			/* every source failed or went away - drop the stale value and back off */
			this.idx = 0;
			this.skipCycles = 5; /* ~50s at the 10s poll interval */
			this.hideTempUI();
			return Promise.resolve();
		}

		return this.readThermal(this.sources[i]).then((res) => {
			const raw = (res && res.content) ? parseInt(String(res.content).trim(), 10) : NaN;
			const temp = this.toCelsius(raw);

			if (isNaN(temp))
				return this.probe(i + 1);

			this.idx = i;
			this.updateTempUI(temp);
		}, () => this.probe(i + 1));
	}
});
