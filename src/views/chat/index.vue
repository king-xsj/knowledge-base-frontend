<script setup lang="ts">
import { reactive, ref, watch, nextTick, onMounted } from "vue";
import { ChatDotRound, Delete } from "@element-plus/icons-vue";
import { streamChat, fetchChatHistory } from "@/api/chat";
import type { ChatMessage as ChatMessageType } from "@/types";
import ChatMessage from "@/components/ChatMessage.vue";
import ChatInput from "@/components/ChatInput.vue";

const messages = ref<ChatMessageType[]>([]);
const streaming = ref(false);
const listEl = ref<HTMLElement | null>(null);

// 距底部小于该阈值（px）视为「在底部」
const NEAR_BOTTOM = 10;
const isAtBottom = ref(true);

// 历史记录分页状态
const hasMore = ref(false);
const loadingHistory = ref(false);

let controller: AbortController | null = null;

/**
 * 生成唯一 ID。
 * crypto.randomUUID 仅在安全上下文（https / localhost）可用，其余环境降级为时间戳 + 随机数拼接。
 */
function makeId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * 滚动事件处理：实时计算剩余未滚动高度，据此更新「是否在底部」标志。
 */
function onScroll() {
  const el = listEl.value;
  if (!el) return;
  isAtBottom.value =
    el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM;

  // 滚动到顶部时加载更早的历史记录
  if (el.scrollTop <= NEAR_BOTTOM) {
    loadOlder();
  }
}

/**
 * 将消息列表滚动到底部。
 */
function scrollToBottom() {
  const el = listEl.value;
  if (el) el.scrollTop = el.scrollHeight;
}

/**
 * 内容变化后自动滚动：仅当用户原本就在底部时才跟随，避免打断向上翻阅。
 */
async function autoScroll() {
  await nextTick();
  if (isAtBottom.value) scrollToBottom();
}

watch(messages, autoScroll, { deep: true });

/**
 * 首次加载：拉取最新的历史记录。
 */
async function loadHistory() {
  if (loadingHistory.value) return;
  loadingHistory.value = true;
  try {
    const { messages: history, hasMore: more } = await fetchChatHistory();
    hasMore.value = more;
    // 若加载期间用户已发送消息，则不覆盖，仅补充分页状态
    if (!messages.value.length) {
      messages.value = history;
    }
  } catch {
    // 历史加载失败时静默降级为空白会话
  } finally {
    loadingHistory.value = false;
  }
}

/**
 * 上拉加载更早的历史记录，并保持视口位置不跳动。
 */
async function loadOlder() {
  if (loadingHistory.value || !hasMore.value || !messages.value.length) return;

  const el = listEl.value;
  const prevHeight = el?.scrollHeight ?? 0;
  loadingHistory.value = true;
  try {
    const before = messages.value[0].id;
    const { messages: history, hasMore: more } = await fetchChatHistory(before);
    hasMore.value = more;
    if (history.length) {
      messages.value = [...history, ...messages.value];
      await nextTick();
      if (el) el.scrollTop = el.scrollHeight - prevHeight;
    }
  } catch {
    // 静默失败，保留现有内容
  } finally {
    loadingHistory.value = false;
  }
}

onMounted(loadHistory);

/**
 * 发送一条消息并流式接收助手回复。
 */
async function send(text: string) {
  const q = text.trim();
  if (!q || streaming.value) return;

  messages.value.push({ id: makeId(), role: "user", content: q, status: "done" });

  // 关键：用 reactive 包裹，后续对 assistant 的修改才能触发视图更新
  const assistant = reactive<ChatMessageType>({
    id: makeId(),
    role: "assistant",
    content: "",
    status: "streaming",
  });
  messages.value.push(assistant);
  streaming.value = true;

  const abortController = new AbortController();
  controller = abortController;

  try {
    await streamChat(q, (event) => {
      if (event.type === "delta") {
        assistant.content += event.content;
      } else if (event.type === "done") {
        // 若后端一次性给出完整回答，避免与已累计内容重复
        if (!assistant.content && event.answer) {
          assistant.content = event.answer;
        }
        assistant.status = "done";
      } else if (event.type === "error") {
        assistant.content = assistant.content || `⚠️ ${event.message}`;
        assistant.status = "error";
      }
    }, abortController.signal);
  } catch (e: any) {
    // 用户主动中断（清空会话）时静默退出，不当作错误显示
    if (abortController.signal.aborted) return;
    assistant.status = "error";
    assistant.content = assistant.content || `⚠️ ${e?.message || "请求失败"}`;
  } finally {
    // 仅当仍是当前请求时才收尾，避免覆盖新请求的状态
    if (controller === abortController) {
      controller = null;
      if (assistant.status === "streaming") assistant.status = "done";
      streaming.value = false;
    }
  }
}

/**
 * 清空会话：中断进行中的流式请求，并重置消息列表与状态。
 */
function clear() {
  controller?.abort();
  controller = null;
  messages.value = [];
  streaming.value = false;
  hasMore.value = false;
  isAtBottom.value = true;
}

/**
 * 发送消息：先滚动到底部，再走发送逻辑。
 */
function onSend(text: string) {
  scrollToBottom();
  send(text);
}
</script>

<template>
  <el-container class="chat">
    <el-header class="chat__header" height="56px">
      <div class="chat__brand">
        <el-icon :size="22"><ChatDotRound /></el-icon>
        <span class="chat__title">智能问答</span>
      </div>
      <el-button text :icon="Delete" @click="clear">清空会话</el-button>
    </el-header>

    <el-main class="chat__main">
      <div ref="listEl" class="chat__scroll" @scroll="onScroll">
        <div v-if="loadingHistory" class="chat__loadmore">加载历史记录中…</div>
        <div v-else-if="!hasMore && messages.length" class="chat__loadmore">
          没有更多历史记录
        </div>

        <div v-if="!messages.length && !loadingHistory" class="chat__empty">
          <el-empty description="你好，我是企业知识库助手，请问有什么可以帮你？">
            <p class="chat__empty-tip">
              我会基于企业知识库回答你的问题，回复会实时流式输出。
            </p>
          </el-empty>
        </div>
        <div v-else class="chat__messages">
          <ChatMessage v-for="msg in messages" :key="msg.id" :message="msg" />
        </div>
      </div>
    </el-main>

    <el-footer class="chat__footer" height="auto">
      <ChatInput :disabled="streaming" @send="onSend" />
    </el-footer>
  </el-container>
</template>

<style lang="scss" scoped>
.chat {
  height: 100%;
  background: var(--el-bg-color);
  border-radius: 8px;
  box-shadow: var(--el-box-shadow-light);
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--el-border-color-lighter);
    background: var(--el-bg-color);
  }

  &__brand {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--el-color-primary);
  }

  &__title {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  &__main {
    padding: 0;
    overflow: hidden;
  }

  &__scroll {
    height: 100%;
    overflow-y: auto;
    padding: 20px;
  }

  &__loadmore {
    text-align: center;
    padding: 8px 0;
    color: var(--el-text-color-secondary);
    font-size: 13px;
  }

  &__empty {
    padding-top: 80px;
  }

  &__empty-tip {
    color: var(--el-text-color-secondary);
    font-size: 13px;
    margin-top: 4px;
  }

  &__footer {
    padding: 0;
    border-top: 1px solid var(--el-border-color-lighter);
    background: var(--el-bg-color);
  }
}
</style>
