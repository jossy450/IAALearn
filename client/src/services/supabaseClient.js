import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabase;

if (!supabaseUrl) {
	console.warn('[supabaseClient] VITE_SUPABASE_URL not set — using demo stub client');

	const noop = async () => ({ data: null, error: null });

	const stub = {
		auth: {
			// v2-style methods used in the app. Provide lightweight fakes so UI flows don't crash.
			signIn: noop,
			signUp: noop,
			signOut: noop,
			// supabase-js v2: signInWithPassword returns { data, error }
			signInWithPassword: async ({ email, password } = {}) => {
				return {
					data: {
						session: {
							access_token: 'demo-access-token',
							provider_token: null,
							user: { id: 'demo-user', email: email || 'demo@local', name: 'Demo User' }
						}
					},
					error: null
				};
			},
			// supabase-js v2: signInWithOAuth({ provider, options })
			signInWithOAuth: async ({ provider, options } = {}) => {
				console.warn(`[supabaseClient stub] signInWithOAuth called for provider=${provider}`);
				// In real flow this triggers a redirect; stub just returns no error so callers proceed.
				return { data: null, error: null };
			},
			user: null,
			session: null,
		},
		from: () => ({ select: noop, insert: noop, update: noop, delete: noop }),
		rpc: noop,
		storage: { from: () => ({ getPublicUrl: () => ({ publicURL: '' }) }) },
	};

	supabase = stub;
} else {
	supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };
