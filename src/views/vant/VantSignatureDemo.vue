<script setup lang="ts">
import { ref, reactive } from 'vue'
import { showToast } from 'vant'
import VantSignature from '@/components/VantSignature.vue'

const form = reactive({
  name: '张三',
  signature: '',
})

// 演示用：是否以投保人姓名作为签字版背景
const useNameAsBg = ref(true)
const customWatermark = ref('书写正楷')
// 上传的图片是否包含背景提示（默认不包含）
const bakeWatermark = ref(false)
// 是否开启「签名文字与姓名一致性校验」（默认关闭；当前为 mock 实现，需后端识别服务方可真实生效）
const enableVerify = ref(false)

/**
 * 签名文字与姓名一致性校验（mock 占位实现）。
 *
 * 重要：浏览器端无法独立完成手写文字识别（无内置 OCR / HTR），
 * 此 mock 仅用于打通「确认 -> 调校验钩子 -> 拦截/通过」流程，
 * 并不真正识别笔迹，请勿当作真实识别使用。
 *
 * 为方便查看「不通过被拦截」的效果，mock 以 50% 概率随机返回不通过。
 * 真实环境接入后端手写识别服务后，把下方函数体替换为：
 *   const text = await recognizeHandwriting(blob)   // 调后端识别，返回文字
 *   return { match: text.trim() === expectedName, recognized: text }
 */
async function mockVerifySignature(_blob: Blob, expectedName: string) {
  await new Promise((r) => setTimeout(r, 400)) // 模拟识别耗时
  const pass = Math.random() < 0.5 // 50% 概率判为不一致，用于演示拦截
  if (pass) {
    return { match: true, recognized: expectedName, message: '' }
  }
  return {
    match: false,
    recognized: '（mock 识别不确定）',
    message: `签名文字与投保人姓名「${expectedName}」不一致，请检查后重新签名`,
  }
}

function onSubmit() {
  if (!form.signature) {
    showToast('请先完成签名')
    return
  }
  showToast('提交成功')
  console.log('提交数据：', JSON.parse(JSON.stringify(form)))
}
</script>

<template>
  <div class="sig-demo">
    <van-nav-bar title="电子签名组件" />

    <van-form @submit="onSubmit">
      <van-cell-group inset>
        <van-field v-model="form.name" label="投保人" placeholder="请输入投保人姓名" />

        <VantSignature
          v-model="form.signature"
          label="投保人签名"
          name="signature"
          required
          :rules="[{ required: true, message: '请完成签名' }]"
          :watermark="customWatermark"
          :signature-name="useNameAsBg ? form.name : ''"
          :bake-watermark="bakeWatermark"
          :verify-signature="enableVerify ? mockVerifySignature : undefined"
        />
      </van-cell-group>

      <div style="margin: 16px">
        <van-button round block type="primary" native-type="submit">提交</van-button>
      </div>
    </van-form>

    <!-- 配置演示 -->
    <van-cell-group inset title="配置演示">
      <van-cell center title="以投保人姓名作背景">
        <template #value>
          <van-switch v-model="useNameAsBg" />
        </template>
      </van-cell>
      <van-field
        v-model="customWatermark"
        label="默认背景提示"
        placeholder="未传姓名时显示"
        :disabled="useNameAsBg"
      />
      <van-cell center title="上传图包含背景提示">
        <template #value>
          <van-switch v-model="bakeWatermark" />
        </template>
      </van-cell>
      <van-cell center title="开启签名文字比对校验（mock）">
        <template #value>
          <van-switch v-model="enableVerify" />
        </template>
      </van-cell>
    </van-cell-group>

    <van-cell-group inset title="签名文字与姓名一致性校验" class="sig-demo__note">
      <van-cell>
        <template #value>
          <span>
            浏览器端无法独立完成手写文字识别，需由<strong>后端手写识别 / OCR 服务</strong>把签名图识别为文字后，
            再与传入姓名比对（防止签错名字）。组件已预留可插拔钩子
            <code>verifySignature</code>，后端接口就绪后接入即可自动拦截不一致签名；本 demo 不涉及伪造的前端识别。
          </span>
        </template>
      </van-cell>
    </van-cell-group>

    <div class="sig-demo__result">
      <p class="sig-demo__label">当前签名图片地址：</p>
      <code class="sig-demo__url">{{ form.signature || '（未签名）' }}</code>
    </div>
  </div>
</template>

<style scoped>
.sig-demo__result {
  margin: 16px;
  padding: 12px;
  background: var(--app-surface, #fff);
  border-radius: 8px;
  border: 1px solid var(--app-border, #ebedf0);
}
.sig-demo__label {
  margin: 0 0 6px;
  font-size: 13px;
  color: var(--app-text-2, #646566);
}
.sig-demo__url {
  font-size: 12px;
  word-break: break-all;
  color: #1989fa;
}
.sig-demo__note :deep(.van-cell__value) {
  font-size: 13px;
  line-height: 1.6;
  color: var(--app-text-2, #646566);
}
.sig-demo__note code {
  font-size: 12px;
  color: #1989fa;
}
</style>
