'use strict';
'require ui';
'require view';

return view.extend({
	render() {
		const form = document.querySelector('form');
		const pwd = document.querySelector('input[type="password"]');

		if (!form)
			return '';

		const dlg = ui.showModal(
			_('Authorization Required'),
			Array.from(document.querySelectorAll('section > *')),
			'login'
		);
		const overlay = document.getElementById('modal_overlay');

		if (overlay)
			overlay.classList.add('login-overlay');

		/* let the browser handle submission natively: that keeps constraint
		   validation (required/pattern) and correct Enter/IME behaviour;
		   this handler only swaps the dialog content for the spinner */
		form.addEventListener('submit', () => {
			dlg.querySelectorAll('*').forEach((node) => {
				node.style.display = 'none';
			});
			dlg.appendChild(E('div', {
				class: 'spinning'
			}, _('Logging in…')));
		});

		if (pwd)
			pwd.focus();

		return '';
	},

	addFooter() {}
});
