import { base } from '$app/paths';
import type { HomeOption, Parcel } from '$lib/model/types';
import { decodeState, encodeState } from '$lib/state/codec';
import { comboKey, defaultState, validateState, type AppState } from '$lib/state/schema';

// Deep $state proxy — all mutations go through this
const app: AppState = $state(defaultState());

const pendingImport: { state: AppState | null } = $state({ state: null });
const storageWarning: { active: boolean } = $state({ active: false });

const STORAGE_KEY = 'homestead:v1';

// Separated so storageWarning assignment is not directly inside $effect body.
// Called only from inside setTimeout (async), so it does not cause a reactive loop.
function persistSnapshot(snapshot: string): void {
	try {
		localStorage.setItem(STORAGE_KEY, snapshot);
	} catch {
		storageWarning.active = true;
	}
}

function initPersistence(): void {
	// 1. Hash takes priority → pendingImport (not auto-applied; user must accept/dismiss)
	const hash = location.hash.slice(1); // strip leading #
	if (hash) {
		const decoded = decodeState(hash);
		if (decoded) {
			pendingImport.state = decoded;
			return; // don't load localStorage when hash present
		}
	}
	// 2. Load from localStorage
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const parsed: unknown = JSON.parse(raw);
			if (validateState(parsed)) {
				Object.assign(app, parsed);
			}
		}
	} catch {
		storageWarning.active = true;
	}
	// 3. Debounced localStorage save on any app change.
	// Uses $effect cleanup return to cancel the pending timer on re-run.
	$effect.root(() => {
		$effect(() => {
			// JSON.stringify traverses the whole state tree, tracking all reactive reads
			const snapshot = JSON.stringify(app);
			const timer = setTimeout(() => persistSnapshot(snapshot), 250);
			return () => clearTimeout(timer);
		});
	});
}

function acceptImport(): void {
	if (!pendingImport.state) return;
	Object.assign(app, pendingImport.state);
	pendingImport.state = null;
	history.replaceState(null, '', location.pathname + location.search);
}

function dismissImport(): void {
	pendingImport.state = null;
	history.replaceState(null, '', location.pathname + location.search);
}

function shareUrl(): string {
	return `${location.origin}${base}/#${encodeState(app)}`;
}

function addParcel(p: Omit<Parcel, 'id'>): void {
	app.parcels.push({ ...p, id: crypto.randomUUID() });
}

function addHome(h: Omit<HomeOption, 'id'>): void {
	app.homes.push({ ...h, id: crypto.randomUUID() });
}

function removeParcel(id: string): void {
	app.parcels = app.parcels.filter((p) => p.id !== id);
	app.muted = app.muted.filter((k) => !k.startsWith(`${id}:`));
	if (app.selected?.startsWith(`${id}:`)) {
		app.selected = null;
	}
}

function removeHome(id: string): void {
	app.homes = app.homes.filter((h) => h.id !== id);
	app.muted = app.muted.filter((k) => !k.endsWith(`:${id}`));
	if (app.selected?.endsWith(`:${id}`)) {
		app.selected = null;
	}
}

function toggleMuted(key: string): void {
	const idx = app.muted.indexOf(key);
	if (idx === -1) {
		app.muted.push(key);
	} else {
		app.muted.splice(idx, 1);
	}
}

export {
	app,
	pendingImport,
	storageWarning,
	initPersistence,
	acceptImport,
	dismissImport,
	shareUrl,
	addParcel,
	addHome,
	removeParcel,
	removeHome,
	toggleMuted,
	comboKey
};
