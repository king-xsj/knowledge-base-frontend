<template>
  <div>
    <div class="toolbar">
      <h3>文档权限管理</h3>
      <el-button type="primary" :loading="reindexing" @click="onReindexAll">
        重建全部索引
      </el-button>
    </div>

    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="tip"
      title="「可访问角色」关联角色管理列表，勾选后点击「保存」会立即重新索引该文档使其生效。列表仅包含已构建索引的文档，新文档会在下次构建索引时自动登记并默认对全部角色可见。"
    />

    <el-table v-loading="loading" :data="documents" border stripe>
      <el-table-column label="文档" min-width="200">
        <template #default="{ row }">{{ basename(row.source) }}</template>
      </el-table-column>
      <el-table-column label="文档路径" min-width="320" show-overflow-tooltip>
        <template #default="{ row }">{{ row.source }}</template>
      </el-table-column>
      <el-table-column label="可访问角色" min-width="360">
        <template #default="{ row }">
          <el-checkbox-group v-model="row.allowedRoleIds" size="small">
            <el-checkbox v-for="r in roles" :key="r.id" :value="r.id">
              {{ r.name }}
            </el-checkbox>
          </el-checkbox-group>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button
            size="small"
            type="primary"
            :loading="savingId === row.id"
            @click="onSave(row)"
          >
            保存
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { listDocuments, updateDocument, reindexAllDocuments } from "@/api/document";
import { listRoles } from "@/api/role";
import type { DocumentConfig, Role } from "@/types";

function basename(source: string): string {
  return source.split(/[\\/]/).pop() ?? source;
}

const documents = ref<DocumentConfig[]>([]);
const roles = ref<Role[]>([]);
const loading = ref(false);
const savingId = ref<number | null>(null);
const reindexing = ref(false);

async function load() {
  loading.value = true;
  try {
    const [docRes, roleRes] = await Promise.all([listDocuments(), listRoles()]);
    roles.value = roleRes.data;
    documents.value = docRes.data.map((d) => ({
      ...d,
      allowedRoleIds: d.allowedRoleIds ?? [],
    }));
  } finally {
    loading.value = false;
  }
}

async function onSave(row: DocumentConfig) {
  savingId.value = row.id;
  try {
    await updateDocument(row.id, {
      allowedRoleIds: row.allowedRoleIds ?? [],
    });
    ElMessage.success("已保存并重新索引该文档");
    await load();
  } catch {
    // 错误提示已在拦截器统一处理
  } finally {
    savingId.value = null;
  }
}

async function onReindexAll() {
  try {
    await ElMessageBox.confirm(
      "将清空并重建全部索引，可能耗时较长，确定继续吗？",
      "提示",
      { type: "warning" }
    );
  } catch {
    return;
  }
  reindexing.value = true;
  try {
    await reindexAllDocuments();
    ElMessage.success("全部索引重建完成");
    await load();
  } catch {
    // 错误提示已在拦截器统一处理
  } finally {
    reindexing.value = false;
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
.tip {
  margin-bottom: 16px;
}
</style>
