<template>
  <div>
    <div class="toolbar">
      <h3>角色管理</h3>
      <el-button type="primary" @click="openCreate">新增角色</el-button>
    </div>

    <el-table v-loading="loading" :data="roles" border stripe>
      <el-table-column prop="name" label="角色名" width="160" />
      <el-table-column label="描述" min-width="300">
        <template #default="{ row }">{{ row.description || "—" }}</template>
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
      :title="editingId ? '编辑角色' : '新增角色'"
      width="480px"
    >
      <el-form :model="form" label-width="100px">
        <el-form-item label="角色名">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" />
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
import { listRoles, createRole, updateRole, deleteRole } from "@/api/role";
import type { Role } from "@/types";

const roles = ref<Role[]>([]);
const loading = ref(false);
const saving = ref(false);
const dialogVisible = ref(false);
const editingId = ref<number | null>(null);

const form = reactive({
  name: "",
  description: "",
});

async function load() {
  loading.value = true;
  try {
    roles.value = (await listRoles()).data;
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editingId.value = null;
  Object.assign(form, { name: "", description: "" });
  dialogVisible.value = true;
}

function openEdit(row: Role) {
  editingId.value = row.id;
  Object.assign(form, {
    name: row.name,
    description: row.description ?? "",
  });
  dialogVisible.value = true;
}

async function onSave() {
  if (!form.name) {
    ElMessage.warning("角色名不能为空");
    return;
  }

  saving.value = true;
  const payload = {
    name: form.name,
    description: form.description,
  };
  try {
    if (editingId.value != null) {
      await updateRole(editingId.value, payload);
      ElMessage.success("更新成功");
    } else {
      await createRole(payload);
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

async function onDelete(row: Role) {
  try {
    await ElMessageBox.confirm(`确定删除角色「${row.name}」吗？`, "提示", { type: "warning" });
  } catch {
    return;
  }
  try {
    await deleteRole(row.id);
    ElMessage.success("删除成功");
    await load();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.error || "删除失败");
  }
}

onMounted(load);
</script>

<style scoped lang="scss">
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
</style>
