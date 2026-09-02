<template>
  <div class="login-page">
    <el-card class="login-card" shadow="always">
      <h2 class="title">📚 企业知识库</h2>
      <p class="subtitle">请使用手机号或邮箱登录</p>

      <el-form @submit.prevent="onSubmit">
        <el-form-item>
          <el-input
            v-model="form.account"
            placeholder="手机号 / 邮箱"
            size="large"
            clearable
          />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            size="large"
            show-password
            @keyup.enter="onSubmit"
          />
        </el-form-item>
        <el-button
          type="primary"
          size="large"
          class="submit"
          :loading="loading"
          @click="onSubmit"
        >
          登录
        </el-button>
      </el-form>

      <div class="hint">
        测试账号：admin@example.com / Password123!
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { login } from "@/api/auth";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const auth = useAuthStore();
const loading = ref(false);
const form = reactive({ account: "", password: "" });

async function onSubmit() {
  if (!form.account || !form.password) {
    ElMessage.warning("请输入账号和密码");
    return;
  }

  loading.value = true;
  try {
    const { data } = await login(form.account, form.password);
    auth.setLogin(data.token, data.user);
    ElMessage.success("登录成功");
    router.push("/chat");
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.error || "登录失败");
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped lang="scss">
.login-page {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1890ff 0%, #001529 100%);
}

.login-card {
  width: 400px;
  padding: 12px 8px;
}

.title {
  text-align: center;
  margin-bottom: 8px;
}

.subtitle {
  text-align: center;
  color: #909399;
  font-size: 13px;
  margin-bottom: 24px;
}

.submit {
  width: 100%;
}

.hint {
  margin-top: 16px;
  text-align: center;
  font-size: 12px;
  color: #c0c4cc;
}
</style>