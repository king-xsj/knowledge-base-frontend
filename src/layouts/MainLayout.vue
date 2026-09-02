<template>
  <el-container class="layout">
    <el-aside width="220px" class="aside">
      <div class="logo">📚 企业知识库</div>
      <el-menu :default-active="activeMenu" router class="menu">
        <el-menu-item index="/chat">
          <el-icon><ChatDotRound /></el-icon>
          <span>智能问答</span>
        </el-menu-item>
        <el-menu-item v-if="isAdmin" index="/users">
          <el-icon><User /></el-icon>
          <span>人员管理</span>
        </el-menu-item>
        <el-menu-item v-if="isAdmin" index="/roles">
          <el-icon><Key /></el-icon>
          <span>角色管理</span>
        </el-menu-item>
        <el-menu-item v-if="isAdmin" index="/documents">
          <el-icon><Lock /></el-icon>
          <span>文档权限</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="spacer" />
        <el-dropdown @command="onCommand">
          <span class="user-info">
            {{ auth.user?.name || "未登录" }}
            <el-tag size="small" class="role-tag">{{ auth.user?.roleName }}</el-tag>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>

      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ChatDotRound, User, Key, Lock } from "@element-plus/icons-vue";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const isAdmin = computed(() => auth.user?.roleName === "admin");
const activeMenu = computed(() => route.path);

function onCommand(cmd: string) {
  if (cmd === "logout") {
    auth.logout();
    router.push("/login");
  }
}
</script>

<style scoped lang="scss">
.layout {
  height: 100%;
}

.aside {
  background: #001529;
  .logo {
    height: 60px;
    line-height: 60px;
    text-align: center;
    color: #fff;
    font-size: 17px;
    font-weight: 600;
  }
  .menu {
    border-right: none;
    background: transparent;
    :deep(.el-menu-item) {
      color: rgba(255, 255, 255, 0.7);
      &.is-active {
        color: #fff;
        background: #1890ff;
      }
      &:hover {
        background: rgba(255, 255, 255, 0.08);
      }
    }
  }
}

.header {
  display: flex;
  align-items: center;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  .spacer {
    flex: 1;
  }
  .user-info {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    color: #303133;
    outline: none;
  }
}

.main {
  padding: 20px;
}
</style>