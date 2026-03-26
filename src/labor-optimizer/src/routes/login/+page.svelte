<script lang="ts">
  import { goto } from '$app/navigation';
  import { getClientSupabase } from '$lib/supabase-client';

  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);

  async function handleSignIn() {
    error = '';
    if (!email || !password) {
      error = 'Email and password are required.';
      return;
    }
    loading = true;
    try {
      const supabase = getClientSupabase();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) {
        error = authError.message;
      } else {
        goto('/dashboard');
      }
    } catch (e: any) {
      error = e.message || 'An unexpected error occurred.';
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center px-4" style="background: #fafafa;">
  <div class="leo-card p-6 sm:p-8 w-full max-w-sm">
    <div class="text-center mb-6">
      <div class="inline-flex items-center justify-center w-12 h-12 rounded-lg mb-3" style="background: #1e3a5f;">
        <span class="text-white font-bold text-lg">H</span>
      </div>
      <h1 class="text-xl font-bold text-[#1a1a1a]">HELIXO</h1>
      <p class="text-sm text-[#6b7280] mt-1">Sign in to the KPI Dashboard</p>
    </div>

    {#if error}
      <div class="mb-4 px-3 py-2 rounded text-sm" style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;">
        {error}
      </div>
    {/if}

    <form onsubmit={(e) => { e.preventDefault(); handleSignIn(); }}>
      <div class="mb-4">
        <label for="email" class="block text-xs font-medium text-[#374151] mb-1">Email</label>
        <input
          id="email"
          type="email"
          bind:value={email}
          placeholder="you@methodco.com"
          class="leo-select w-full"
          autocomplete="email"
        />
      </div>

      <div class="mb-6">
        <label for="password" class="block text-xs font-medium text-[#374151] mb-1">Password</label>
        <input
          id="password"
          type="password"
          bind:value={password}
          placeholder="Enter password"
          class="leo-select w-full"
          autocomplete="current-password"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        class="leo-btn w-full disabled:opacity-50"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  </div>
</div>
