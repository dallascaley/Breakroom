import { reactive } from 'vue'
import { useRouter } from 'vue-router'

const state = reactive({
  username: null,
  // other user fields...
})

const router = useRouter()

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
  }
});
