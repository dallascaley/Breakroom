import { reactive } from 'vue'

export const user = reactive({
  username: null,
  async fetchUser() {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include' // Required to send cookies
      });

      if (!res.ok) throw new Error('Not logged in');

      const data = await res.json();
      user.username = data.username;
    } catch (err) {
      console.log(err);
      user.username = null;
    }
  }
});
