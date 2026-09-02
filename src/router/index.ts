import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/login",
      name: "login",
      component: () => import("@/views/login/index.vue"),
      meta: { public: true },
    },
    {
      path: "/",
      component: () => import("@/layouts/MainLayout.vue"),
      redirect: "/chat",
      children: [
        { path: "chat", name: "chat", component: () => import("@/views/chat/index.vue") },
        {
          path: "users",
          name: "users",
          component: () => import("@/views/users/index.vue"),
          meta: { admin: true },
        },
        {
          path: "roles",
          name: "roles",
          component: () => import("@/views/roles/index.vue"),
          meta: { admin: true },
        },
        {
          path: "documents",
          name: "documents",
          component: () => import("@/views/documents/index.vue"),
          meta: { admin: true },
        },
      ],
    },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();

  if (to.meta.public) return true;
  if (!auth.token) return { name: "login" };
  if (to.meta.admin && auth.user?.roleName !== "admin") return { name: "chat" };
  return true;
});

export default router;