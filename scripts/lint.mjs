#!/usr/bin/env node
'use strict';

/*
 * Static lint for luci-theme-tp. Run from anywhere:  node scripts/lint.mjs
 *
 * Checks:
 *   1. every .js file under htdocs/ passes `node --check`
 *   2. ucode templates have balanced {% %} / {{ }} / {# #} delimiters
 *   3. CSS files have balanced braces after stripping comments and strings
 *   4. every imgs/* asset referenced from templates/CSS/JS actually exists
 *   5. L.require() / ui.instantiateView() / include() targets resolve
 *
 * Exits non-zero if any check fails, so CI jobs fail on lint errors.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;

function fail(msg) {
	console.error(`FAIL ${msg}`);
	failures++;
}

function pass(msg) {
	console.log(`ok   ${msg}`);
}

function walk(dir, out = []) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory())
			walk(full, out);
		else
			out.push(full);
	}
	return out;
}

const rel = (f) => path.relative(root, f);
const allFiles = walk(root).filter((f) => !rel(f).split(path.sep).includes('.git'));

/* ------------------------------------------------------------------ */
/* 1. JavaScript syntax                                                */
/* ------------------------------------------------------------------ */
{
	const jsFiles = allFiles.filter((f) => f.endsWith('.js') && rel(f).startsWith(`htdocs${path.sep}`));
	let bad = 0;

	for (const f of jsFiles) {
		try {
			execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
		} catch (err) {
			fail(`node --check ${rel(f)}: ${String(err.stderr || err.message).trim()}`);
			bad++;
		}
	}

	if (!bad)
		pass(`node --check: ${jsFiles.length} JS file(s) clean`);
}

/* ------------------------------------------------------------------ */
/* 2. ucode template delimiter pairing                                 */
/* ------------------------------------------------------------------ */
{
	const tplFiles = allFiles.filter((f) => f.endsWith('.ut'));
	const pairs = [['{%', '%}'], ['{{', '}}'], ['{#', '#}']];
	let bad = 0;

	for (const f of tplFiles) {
		const src = fs.readFileSync(f, 'utf8');

		for (const [open, close] of pairs) {
			const opens = src.split(open).length - 1;
			const closes = src.split(close).length - 1;

			if (opens !== closes) {
				fail(`${rel(f)}: '${open}' occurs ${opens} time(s) but '${close}' occurs ${closes}`);
				bad++;
			}
		}
	}

	if (!bad)
		pass(`template delimiters: ${tplFiles.length} .ut file(s) balanced`);
}

/* ------------------------------------------------------------------ */
/* 3. CSS brace balance (comments and strings removed)                 */
/* ------------------------------------------------------------------ */
{
	const cssFiles = allFiles.filter((f) => f.endsWith('.css'));
	let bad = 0;

	for (const f of cssFiles) {
		const src = fs.readFileSync(f, 'utf8');
		let stripped = '';
		let i = 0;

		while (i < src.length) {
			const two = src.slice(i, i + 2);

			if (two === '/*') {
				const end = src.indexOf('*/', i + 2);
				if (end === -1) {
					fail(`${rel(f)}: unterminated CSS comment`);
					bad++;
					break;
				}
				i = end + 2;
				continue;
			}

			const ch = src[i];

			if (ch === '"' || ch === "'") {
				/* honour backslash escapes so a \" inside the string does not end it */
				let j = i + 1;
				while (j < src.length && src[j] !== ch) {
					if (src[j] === '\\')
						j++;
					j++;
				}
				if (j >= src.length) {
					fail(`${rel(f)}: unterminated CSS string`);
					bad++;
					break;
				}
				i = j + 1;
				continue;
			}

			stripped += ch;
			i++;
		}

		let depth = 0;

		for (const ch of stripped) {
			if (ch === '{')
				depth++;
			else if (ch === '}')
				depth--;

			if (depth < 0)
				break;
		}

		if (depth !== 0) {
			fail(`${rel(f)}: unbalanced braces (net depth ${depth})`);
			bad++;
		}
	}

	if (!bad)
		pass(`CSS braces: ${cssFiles.length} file(s) balanced`);
}

/* ------------------------------------------------------------------ */
/* 4. referenced imgs/* assets exist                                   */
/* ------------------------------------------------------------------ */
{
	const textFiles = allFiles.filter((f) => /\.(ut|js|css|md|mjs)$/.test(f));
	const imgDir = path.join(root, 'htdocs', 'luci-static', 'tp', 'imgs');
	const known = new Set(fs.existsSync(imgDir) ? fs.readdirSync(imgDir) : []);
	const seen = new Map();
	let bad = 0;

	for (const f of textFiles) {
		const src = fs.readFileSync(f, 'utf8');

		for (const m of src.matchAll(/imgs\/([A-Za-z0-9_.@-]+)/g)) {
			if (!seen.has(m[1]))
				seen.set(m[1], rel(f));
		}
	}

	for (const [name, where] of seen) {
		if (!known.has(name)) {
			fail(`asset 'imgs/${name}' referenced from ${where} does not exist`);
			bad++;
		}
	}

	if (!bad)
		pass(`asset references: ${seen.size} img reference(s) resolve`);
}

/* ------------------------------------------------------------------ */
/* 5. module / view / include targets resolve                          */
/* ------------------------------------------------------------------ */
{
	const textFiles = allFiles.filter((f) => /\.(ut|js)$/.test(f));
	let bad = 0;

	/* modules shipped by luci-base (a declared dependency in the Makefile);
	   they cannot be resolved inside this repository */
	const luciBaseModules = new Set([
		'baseclass', 'dom', 'fs', 'poll', 'rpc', 'session', 'ui', 'view'
	]);

	const checks = [
		{
			re: /\bL\.require\('([^']+)'\)/g,
			resolve: (m) => path.join(root, 'htdocs', 'luci-static', 'resources', `${m}.js`),
			what: 'L.require target'
		},
		{
			re: /\bui\.instantiateView\('([^']+)'\)/g,
			resolve: (m) => path.join(root, 'htdocs', 'luci-static', 'resources', 'view', `${m.replace(/\./g, '/')}.js`),
			what: 'instantiateView target'
		},
		{
			re: /\binclude\('([^']+)'/g,
			resolve: (m) => path.join(root, 'ucode', 'template', 'themes', 'tp', `${m}.ut`),
			what: 'include target'
		}
	];

	for (const f of textFiles) {
		const src = fs.readFileSync(f, 'utf8');

		for (const { re, resolve, what } of checks) {
			for (const m of src.matchAll(re)) {
				if (what === 'L.require target' && luciBaseModules.has(m[1]))
					continue;

				if (!fs.existsSync(resolve(m[1]))) {
					fail(`${what} '${m[1]}' referenced from ${rel(f)} does not resolve`);
					bad++;
				}
			}
		}
	}

	if (!bad)
		pass('module/view/include references resolve');
}

console.log(failures ? `\n${failures} problem(s) found` : '\nlint passed');
process.exit(failures ? 1 : 0);
