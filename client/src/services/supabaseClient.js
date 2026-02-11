import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl) {
	console.warn('[supabaseClient] VITE_SUPABASE_URL not set — using demo stub client');

	const noop = async () => ({ data: null, error: null });

	const stub = {
		auth: {
			signIn: noop,
			signUp: noop,
			signOut: noop,
			user: null,
			session: null,
		},
		from: () => ({ select: noop, insert: noop, update: noop, delete: noop }),
		rpc: noop,
		storage: { from: () => ({ getPublicUrl: () => ({ publicURL: '' }) }) },
	};

	export const supabase = stub;
} else {
	export const supabase = createClient(supabaseUrl, supabaseAnonKey);
}
