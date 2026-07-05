import { base } from '$app/paths';
import type { HomeOption, Parcel } from '$lib/model/types';
import { decodeState, encodeState } from '$lib/state/codec';
import { comboKey, defaultState, validateState, type AppState } from '$lib/state/schema';

// Deep $state proxy — all mutations go through this
const app: AppState = $state(defaultState());

const pendingImport: { state: AppState | null } = $state({ state: null });
const storageWarning: { active: boolean } = $state({ active: false });
const linkWarning: { active: boolean } = $state({ active: false });

const STORAGE_KEY = 'homestead:v1';

// Snapshot of the saved data captured when an import becomes pending, so
// dismissImport() can revert the live app without ever having clobbered
// localStorage while the shared link was only being previewed.
let importRestore: AppState | null = null;

// Separated so storageWarning assignment is not directly inside $effect body.
// Called only from inside setTimeout (async), so it does not cause a reactive loop.
function persistSnapshot(snapshot: string): void {
	try {
		localStorage.setItem(STORAGE_KEY, snapshot);
	} catch {
		storageWarning.active = true;
	}
}

// Read the validated saved state from localStorage, or null if absent/invalid.
function loadSaved(): AppState | null {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const parsed: unknown = JSON.parse(raw);
			if (validateState(parsed)) return parsed;
		}
	} catch {
		storageWarning.active = true;
	}
	return null;
}

function initPersistence(): void {
	// 1. A valid URL hash beats localStorage (spec): apply it so it renders, but
	//    keep it pending (keep/dismiss) and don't persist until accepted.
	const hash = location.hash.slice(1); // strip leading #
	if (hash) {
		const decoded = decodeState(hash);
		if (decoded) {
			// Snapshot current saved data (or defaults) as the dismiss-restore target.
			importRestore = loadSaved() ?? defaultState();
			Object.assign(app, decoded);
			pendingImport.state = decoded;
		} else {
			// Malformed hash → ignore + notice, fall back to localStorage.
			linkWarning.active = true;
			const saved = loadSaved();
			if (saved) Object.assign(app, saved);
		}
	} else {
		// 2. No hash → load from localStorage if valid.
		const saved = loadSaved();
		if (saved) Object.assign(app, saved);
	}

	// 3. Debounced localStorage save on any app change — GATED while an import is
	//    pending so a shared-link preview never clobbers saved data.
	//    Uses $effect cleanup return to cancel the pending timer on re-run.
	$effect.root(() => {
		$effect(() => {
			// JSON.stringify traverses the whole state tree, tracking all reactive reads
			const snapshot = JSON.stringify(app);
			// Track pendingImport.state so accept/dismiss re-run this effect.
			if (pendingImport.state !== null) return;
			const timer = setTimeout(() => persistSnapshot(snapshot), 250);
			return () => clearTimeout(timer);
		});
	});
}

function acceptImport(): void {
	if (!pendingImport.state) return;
	// Flush the imported state to localStorage synchronously BEFORE clearing the
	// pending flag and stripping the hash. The debounced $effect only schedules a
	// write ~250ms out; a reload inside that window would otherwise lose the
	// just-accepted import.
	persistSnapshot(JSON.stringify(app));
	pendingImport.state = null;
	importRestore = null;
	history.replaceState(null, '', location.pathname + location.search);
}

function dismissImport(): void {
	// Revert the live app to the pre-import snapshot; saved data is untouched.
	if (importRestore) {
		Object.assign(app, importRestore);
		importRestore = null;
	}
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
	linkWarning,
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
