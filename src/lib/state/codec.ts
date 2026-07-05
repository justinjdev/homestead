// src/lib/state/codec.ts
// Pure TypeScript — no svelte, @sveltejs/*, or $app/* imports allowed.
//
// URL hash contract (CLAUDE.md hard rule 4):
//   base64url(JSON.stringify(state)), no padding.
//
// Encoding strategy:
//   Node (Vitest): Buffer.from(json, 'utf8').toString('base64url')
//   Browser: TextEncoder → binary string → btoa, then +→- /→_ strip =
//
// The Node path is the canonical reference — the visual-qa.mjs harness uses
// Buffer.from(json).toString('base64url'), so both paths must produce identical
// output for ASCII-safe JSON (which JSON.stringify always produces).
import { validateState, type AppState } from './schema';

function toBase64url(json: string): string {
	// Node / Vitest path
	if (typeof Buffer !== 'undefined') {
		return Buffer.from(json, 'utf8').toString('base64url');
	}
	// Browser path: TextEncoder → Uint8Array → binary string → btoa → base64url
	const bytes = new TextEncoder().encode(json);
	let binary = '';
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(encoded: string): string {
	// Node / Vitest path
	if (typeof Buffer !== 'undefined') {
		return Buffer.from(encoded, 'base64url').toString('utf8');
	}
	// Browser path: base64url → base64 → binary → TextDecoder
	const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
	const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return new TextDecoder().decode(bytes);
}

export function encodeState(s: AppState): string {
	return toBase64url(JSON.stringify(s));
}

export function decodeState(hash: string): AppState | null {
	try {
		const json = fromBase64url(hash);
		const parsed: unknown = JSON.parse(json);
		if (!validateState(parsed)) return null;
		return parsed;
	} catch {
		return null;
	}
}
