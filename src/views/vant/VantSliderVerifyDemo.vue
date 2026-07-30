<script setup lang="ts">
/**
 * VantSliderVerify 拖动滑块验证组件演示
 *
 * 演示：
 *   1) 基础用法：v-model 绑定时验证通过状态
 *   2) 配合「获取验证码」：未通过滑块验证时按钮禁用，通过后解锁
 *   3) 禁用态：disabled 时不可拖动（如倒计时进行中）
 *   4) 重置：通过 reset() 把状态清回未验证，需重新滑动
 */
import { ref } from 'vue'
import { showToast } from 'vant'
import VantSliderVerify from '../../components/VantSliderVerify.vue'

// 基础绑定
const verified = ref(false)

// 配合获取验证码
const verifiedForCode = ref(false)
const sliderRef = ref<InstanceType<typeof VantSliderVerify> | null>(null)
const countdown = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

function getCode() {
  if (!verifiedForCode.value) return
  showToast('已发送验证码（演示）')
  // 模拟倒计时禁用
  countdown.value = 60
  sliderRef.value?.reset()
  timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }, 1000)
}

// 禁用态演示
const disabledVerified = ref(false)
const disabledOn = ref(true)
</script>

<template>
  <div class="slider-verify-demo">
    <van-nav-bar title="VantSliderVerify 滑块验证" />

    <!-- 1. 基础用法 -->
    <section class="block">
      <h3>1. 基础用法</h3>
      <p class="hint">将滑块拖到最右侧即可验证通过，松手时进度 ≥ 95% 视为成功。</p>
      <VantSliderVerify v-model="verified" />
      <van-cell-group inset class="status">
        <van-cell title="当前状态" :value="verified ? '已验证 ✓' : '未验证'" />
      </van-cell-group>
    </section>

    <!-- 2. 配合获取验证码 -->
    <section class="block">
      <h3>2. 配合「获取验证码」</h3>
      <p class="hint">未通过滑块验证前，按钮保持禁用；通过后解锁并进入倒计时。</p>
      <VantSliderVerify ref="sliderRef" v-model="verifiedForCode" :disabled="countdown > 0" />
      <div class="actions">
        <van-button
          type="primary"
          block
          :disabled="!verifiedForCode || countdown > 0"
          @click="getCode"
        >
          {{ countdown > 0 ? `${countdown}s 后重发` : '获取验证码' }}
        </van-button>
      </div>
    </section>

    <!-- 3. 禁用态 -->
    <section class="block">
      <h3>3. 禁用态</h3>
      <p class="hint">通过开关控制 disabled，禁用时滑块不可拖动。</p>
      <van-cell-group inset>
        <van-cell title="禁用滑块" center>
          <template #value>
            <van-switch v-model="disabledOn" size="20" />
          </template>
        </van-cell>
      </van-cell-group>
      <VantSliderVerify v-model="disabledVerified" :disabled="disabledOn" />
    </section>

    <!-- API 速览 -->
    <section class="block">
      <h3>API 速览</h3>
      <van-cell-group inset>
        <van-cell title="v-model (modelValue)" label="boolean，是否已验证通过" />
        <van-cell title="disabled" label="boolean，禁用拖动" />
        <van-cell title="update:modelValue" label="验证状态变化时回传" />
        <van-cell title="reset()" label="暴露方法：重置为未验证状态" />
      </van-cell-group>
    </section>
  </div>
</template>

<style scoped>
.slider-verify-demo {
  padding-bottom: 24px;
}
.block {
  margin: 12px 0;
}
.block h3 {
  margin: 8px 16px 4px;
  font-size: 15px;
  color: var(--app-text);
}
.hint {
  margin: 0 16px 8px;
  font-size: 12px;
  color: var(--app-text-3);
  line-height: 1.5;
}
.status {
  margin-top: 8px;
}
.actions {
  padding: 12px 16px 0;
}
</style>
