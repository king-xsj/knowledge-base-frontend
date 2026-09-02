import { defineStore } from "pinia";
import { ref } from "vue";
import type { User } from "@/types";

function safeParse<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore("auth", () => {
  const token = ref<string | null>(localStorage.getItem("token"));
  const user = ref<User | null>(safeParse<User>(localStorage.getItem("user")));

  function setLogin(tokenValue: string, userValue: User) {
    token.value = tokenValue;
    user.value = userValue;
    localStorage.setItem("token", tokenValue);
    localStorage.setItem("user", JSON.stringify(userValue));
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  return { token, user, setLogin, logout };
});