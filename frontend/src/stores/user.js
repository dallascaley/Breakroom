import { reactive } from 'vue'

const state = reactive({
  username: null,
  // other user fields...
})

export const user = reactive({
  get username() {
    return state.username
  },
  async fetchUser() {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include' // Required to send cookies
      });

      if (!res.ok) throw new Error('Not logged in');

      const data = await res.json();
      state.username = data.username;
    } catch (err) {
      console.log(err);
      state.username = null;
    }
  },

  async logout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      state.username = null;
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }
});
