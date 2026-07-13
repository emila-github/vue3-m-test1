<script setup lang="ts">
/**
 * VantUpload 示例：头像 / 身份证人像面 / 身份证国徽面 / 证件上传（自定义 UI）
 */
import { ref } from 'vue'
import VantUpload from '@/components/VantUpload.vue'

// 模拟上传接口：延迟后返回本地预览 URL（真实项目替换为 :upload="apiUpload"）
function mockUpload(file: File): Promise<{ url: string }> {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ url: URL.createObjectURL(file) }), 800)
  })
}

// 各类已上传值
const avatar = ref('')
const idFront = ref('')
const idBack = ref('')
const certSingle = ref('')
const certMulti = ref<string[]>([])
const images = ref<string[]>([])

// change 回显
const log = ref('')
function onChange(type: string, url: string) {
  log.value = `[${type}] ${url ? url.slice(0, 40) + '…' : '（已移除）'}`
}
</script>

<template>
  <div class="upload-demo">
    <van-nav-bar title="VantUpload 示例" left-text="返回" left-arrow @click-left="$router.back()" />

    <div class="card">
      <div class="section-title">① 头像上传（圆形）</div>
      <VantUpload
        v-model="avatar"
        type="avatar"
        :upload="mockUpload"
        @change="onChange('头像', $event)"
      />
    </div>

    <div class="card">
      <div class="section-title">② 身份证人像面</div>
      <VantUpload
        v-model="idFront"
        type="idcard"
        variant="front"
        :upload="mockUpload"
        @change="onChange('人像面', $event)"
      />
    </div>

    <div class="card">
      <div class="section-title">③ 身份证国徽面</div>
      <VantUpload
        v-model="idBack"
        type="idcard"
        variant="back"
        :upload="mockUpload"
        @change="onChange('国徽面', $event)"
      />
    </div>

    <div class="card">
      <div class="section-title">④ 证件上传（自定义 UI · 单选）</div>
      <p class="hint">支持图片 / PDF，自定义文件列表展示名称、大小与进度。</p>
      <VantUpload
        v-model="certSingle"
        type="document"
        :upload="mockUpload"
        @change="onChange('证件', $event)"
      />
    </div>

    <div class="card">
      <div class="section-title">⑤ 证件上传（自定义 UI · 多选）</div>
      <p class="hint">multiple 模式，最多 5 个。</p>
      <VantUpload
        v-model="certMulti"
        type="document"
        multiple
        :max-count="5"
        :upload="mockUpload"
        @change="onChange('证件(多)', $event)"
      />
    </div>

    <div class="card">
      <div class="section-title">⑥ 多图片上传（多选）</div>
      <p class="hint">type="image" + multiple，最多 9 张，缩略图尺寸与占位保持一致。</p>
      <VantUpload
        v-model="images"
        type="image"
        multiple
        :upload="mockUpload"
        @change="onChange('多图片', $event)"
      />
    </div>

    <div class="card">
      <div class="section-title">⑦ change 事件回显</div>
      <p class="hint">{{ log || '（暂无操作）' }}</p>
    </div>

    <div class="card">
      <div class="section-title">使用说明</div>
      <p class="hint">· 组件基于 <code>van-uploader</code>（图片类）+ 自定义上传区（证件类）。</p>
      <p class="hint">
        · <code>type="avatar"</code> 圆形头像；<code>type="idcard"</code> 配合
        <code>variant="front|back"</code> 展示身份证正反面占位。
      </p>
      <p class="hint">
        · <code>type="document"</code> 证件上传，自定义 UI 展示图标 / 名称 / 大小 / 进度 /
        删除，支持 PDF。
      </p>
      <p class="hint">
        · <code>type="image"</code> + <code>multiple</code> 支持多图片上传；多选时
        <code>v-model</code> 为 string[]。
      </p>
      <p class="hint">
        · 传入 <code>:upload="fn"</code> 自定义真实上传；不传则使用本地 ObjectURL 预览。
      </p>
      <p class="hint">
        · 支持 <code>label</code> / <code>required</code> / <code>disabled</code> /
        <code>readonly</code> / <code>maxSize</code> / <code>accept</code>。
      </p>
    </div>
  </div>
</template>

<style scoped>
.upload-demo {
  padding-bottom: 24px;
}
.card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #323233;
  margin-bottom: 12px;
}
.hint {
  font-size: 12px;
  color: #969799;
  line-height: 1.6;
  margin: 0 0 10px;
}
.hint code {
  background: #f0f0f0;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 11px;
  color: #1989fa;
}
</style>
