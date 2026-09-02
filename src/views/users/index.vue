<template>
  <div>
    <div class="toolbar">
      <h3>人员管理</h3>
      <el-button type="primary" @click="openCreate">新增用户</el-button>
    </div>

    <el-table v-loading="loading" :data="users" border stripe>
      <el-table-column prop="name" label="姓名" width="130" />
      <el-table-column prop="email" label="邮箱" min-width="200">
        <template #default="{ row }">{{ row.email || "—" }}</template>
      </el-table-column>
      <el-table-column prop="phone" label="手机号" width="140">
        <template #default="{ row }">{{ row.phone || "—" }}</template>
      </el-table-column>
      <el-table-column prop="roleName" label="角色" width="110">
        <template #default="{ row }">
          <el-tag size="small">{{ row.roleName }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="department" label="部门" width="140">
        <template #default="{ row }">{{ row.department || "—" }}</template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑用户' : '新增用户'"
      width="480px"
    >
      <el-form :model="form" label-width="80px">
        <el-form-item label="姓名">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.roleId" placeholder="选择角色" style="width: 100%">
            <el-option v-for="r in roles" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="部门">
          <el-input v-model="form.department" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            :placeholder="editingId ? '留空则不修改' : '设置初始密码'"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="onSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { listUsers, createUser, updateUser, deleteUser, type UserPayload } from "@/api/user";
import { listRoles } from "@/api/role";
import type { Role, User } from "@/types";

const users = ref<User[]>([]);
const roles = ref<Role[]>([]);
const loading = ref(false);
const saving = ref(false);
const dialogVisible = ref(false);
const editingId = ref<string | null>(null);

const form = reactive<Omit<UserPayload, "roleId"> & { roleId: number | null }>({
  name: "",
  email: "",
  phone: "",
  roleId: null,
  department: "",
  password: "",
});

async function load() {
  loading.value = true;
  try {
    users.value = (await listUsers()).data;
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editingId.value = null;
  Object.assign(form, { name: "", email: "", phone: "", roleId: null, department: "", password: "" });
  dialogVisible.value = true;
}

function openEdit(row: User) {
  editingId.value = row.id;
  Object.assign(form, {
    name: row.name,
    email: row.email ?? "",
    phone: row.phone ?? "",
    roleId: row.roleId,
    department: row.department ?? "",
    password: "",
  });
  dialogVisible.value = true;
}

async function onSave() {
  if (!form.name || !form.roleId) {
    ElMessage.warning("姓名和角色不能为空");
    return;
  }
  if (!form.email && !form.phone) {
    ElMessage.warning("邮箱和手机号至少填一个");
    return;
  }

  saving.value = true;
  const payload: UserPayload = {
    name: form.name,
    email: form.email || undefined,
    phone: form.phone || undefined,
    roleId: form.roleId,
    department: form.department || undefined,
    password: form.password || undefined,
  };
  try {
    if (editingId.value) {
      await updateUser(editingId.value, payload);
      ElMessage.success("更新成功");
    } else {
      await createUser(payload);
      ElMessage.success("创建成功");
    }
    dialogVisible.value = false;
    await load();
  } catch {
    // 错误提示已在拦截器统一处理
  } finally {
    saving.value = false;
  }
}

async function onDelete(row: User) {
  try {
    await ElMessageBox.confirm(`确定删除用户「${row.name}」吗？`, "提示", { type: "warning" });
  } catch {
    return;
  }
  await deleteUser(row.id);
  ElMessage.success("删除成功");
  await load();
}

onMounted(async () => {
  await load();
  roles.value = (await listRoles()).data;
});
</script>

<style scoped lang="scss">
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
</style>