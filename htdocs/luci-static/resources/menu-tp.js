'use strict';
'require baseclass';
'require ui';

return baseclass.extend({
	__init__() {
		ui.menu.load().then((tree) => this.render(tree));
	},

	render(tree) {
		let node = tree;
		let url = '';

		this.renderModeMenu(tree);

		if (L.env.dispatchpath.length >= 3) {
			for (let i = 0; i < 3 && node; i++) {
				node = node.children[L.env.dispatchpath[i]];
				url = url + (url ? '/' : '') + L.env.dispatchpath[i];
			}

			if (node)
				this.renderTabMenu(node, url);
		}
	},

	renderTabMenu(tree, url, level = 0) {
		const container = document.querySelector('#tabmenu');
		if (!container)
			return;

		const ul = E('ul', { 'class': 'tabs' });
		const children = ui.menu.getChildren(tree);
		let activeNode = null;

		children.forEach(child => {
			const isActive = (L.env.dispatchpath[3 + level] == child.name);
			const className = `tabmenu-item-${child.name}${isActive ? ' active' : ''}`;

			ul.appendChild(E('li', { 'class': className }, [
				E('a', { 'href': L.url(url, child.name) }, [ _(child.title) ])]));

			if (isActive)
				activeNode = child;
		});

		if (ul.children.length == 0)
			return;

		container.appendChild(ul);
		container.style.display = '';

		if (activeNode)
			this.renderTabMenu(activeNode, url + '/' + activeNode.name, level + 1);
	},

	navIcon(child) {
		try {
			const byName = {
			status: '◈', system: '❖', network: '🌐', services: '⚙',
			nas: '💾', vpn: '🔒', logout: '⏻',
			istore: '🛒', store: '🛒', modem: '📡'
		};
		const byTitle = [
			[/调制解调|modem/i, '📡'],
			[/iStore|应用|软件|插件/i, '🛒'],
			[/退出|登出|logout/i, '⏻'],
			[/状态|status/i, '◈'],
			[/系统|system/i, '❖'],
			[/网络|network/i, '🌐'],
			[/服务|services/i, '⚙'],
			[/存储|nas|硬盘/i, '💾'],
			[/vpn|代理|加速/i, '🔒']
		];

		const named = byName[String(child.name || '').toLowerCase()];
		if (named)
			return named;

		const title = String(child.title || '');
		for (const [re, glyph] of byTitle)
			if (re.test(title))
				return glyph;

			return '◆';
		} catch (e) {
			return '◆';
		}
	},

	renderSideMenu(tree, url) {
		const container = document.querySelector('#sidemenu');
		const sidebar = document.querySelector('.sidebar');
		if (!container)
			return;

		container.innerHTML = '';
		const children = ui.menu.getChildren(tree);

		if (children.length == 0) {
			container.style.display = 'none';
			if (sidebar)
				sidebar.style.display = 'none';
			return;
		}

		const currentPath = L.env.requestpath.join('/');
		const ul = E('ul', { 'class': 'side-nav' });

		children.forEach(child => {
			const itemPath = (url + '/' + child.name).replace(/^\/+/, '');
			const isActive = currentPath == itemPath || currentPath.indexOf(itemPath + '/') == 0;
			const children2 = ui.menu.getChildren(child);
			const hasChildren = children2.length > 0;

			const li = E('li', { 'class': (isActive ? 'active ' : '') + 'side-item-' + child.name }, [
				E('a', { 'href': L.url(url, child.name), 'title': _(child.title) }, [
					E('span', { 'class': 'nav-ico', 'aria-hidden': 'true' }, [ this.navIcon(child) ]),
					E('span', { 'class': 'nav-txt' }, [ _(child.title) ])
				])
			]);

			if (hasChildren && isActive) {
				const subUl = E('ul', { 'class': 'side-sub' });
				children2.forEach(child2 => {
					const subPath = (url + '/' + child.name + '/' + child2.name).replace(/^\/+/, '');
					const isSubActive = currentPath == subPath;
					subUl.appendChild(E('li', { 'class': (isSubActive ? 'active ' : '') + 'side-sub-item-' + child2.name }, [
						E('a', { 'href': L.url(url, child.name, child2.name), 'title': _(child2.title) }, [
							E('span', { 'class': 'nav-ico sub', 'aria-hidden': 'true' }, [ '•' ]),
							E('span', { 'class': 'nav-txt' }, [ _(child2.title) ])
						])
					]));
				});
				li.appendChild(subUl);
			}

			ul.appendChild(li);
		});

		container.appendChild(ul);
		container.style.display = '';
		if (sidebar)
			sidebar.style.display = '';
	},

	renderModeMenu(tree) {
		const ul = document.querySelector('#topmenu');
		if (!ul)
			return;

		const children = ui.menu.getChildren(tree);

		children.forEach((child, index) => {
			const isActive = L.env.requestpath.length
				? child.name === L.env.requestpath[0]
				: index === 0;

			const li = E('li', { 'class': isActive ? 'active' : '' }, [
				E('a', { 'href': L.url(child.name) }, [_(child.title)])
			]);

			li.addEventListener('click', (ev) => {
				if (!isActive)
					return;

				ev.preventDefault();
				this.renderSideMenu(child, child.name);
			});

			ul.appendChild(li);

			if (isActive)
				this.renderSideMenu(child, child.name);
		});

		if (ul.children.length > 0)
			ul.style.display = '';
	}
});
