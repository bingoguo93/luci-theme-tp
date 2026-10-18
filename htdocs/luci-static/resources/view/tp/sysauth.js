'use strict';
'require ui';
'require view';

return view.extend({
	render() {
		const form = document.querySelector('form');
		const btn = document.querySelector('button');
		const pwd = document.querySelector('input[type="password"]');

		if (!form || !btn)
			return '';

		const dlg = ui.showModal(
			_('Authorization Required'),
			Array.from(document.querySelectorAll('section > *')),
			'login'
		);
		const overlay = document.getElementById('modal_overlay');

		if (overlay)
			overlay.classList.add('login-overlay');

		form.addEventListener('keypress', (ev) => {
			if (ev.key === 'Enter') {
				/* one explicit click only: without preventDefault the
				   browser's implicit submission races form.submit() */
				ev.preventDefault();
				btn.click();
			}
		});

		btn.addEventListener('click', () => {
			dlg.querySelectorAll('*').forEach((node) => {
				node.style.display = 'none';
			});
			dlg.appendChild(E('div', {
				class: 'spinning'
			}, _('Logging in…')));

			form.submit();
		});

		if (pwd)
			pwd.focus();

		return '';
	},

	addFooter() {}
});
