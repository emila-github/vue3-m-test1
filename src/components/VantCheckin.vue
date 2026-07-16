<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick, readonly } from 'vue'
import { showToast } from 'vant'

// ==================== 类型 ====================
/** 经纬度坐标 */
export interface Position {
  lat: number
  lng: number
}
/** 一次打卡记录 */
export interface CheckinResult {
  lat: number
  lng: number
  address: string
  /** ISO 时间戳 */
  timestamp: string
  /** 本地时间 HH:mm:ss */
  time: string
  /** 是否为当日首次打卡 */
  isFirst: boolean
  /** 首次打卡时间 */
  firstTime?: string
}

// ==================== Props ====================
const props = withDefaults(
  defineProps<{
    title?: string
    /** 腾讯地图 Key（优先使用）；缺省读取 VITE_TMAP_KEY */
    mapKey?: string
    /** 是否自动定位 */
    autoLocate?: boolean
    /** 定位超时（毫秒） */
    locateTimeout?: number
    /** 是否启用微信定位通道（微信环境优先 wx.getLocation） */
    useWxLocation?: boolean
    /**
     * 微信 JS-SDK 配置加载器（企业微信需后端下发签名）。
     * 返回 wx.config 所需参数；返回 null 表示由宿主自行完成 wx.config。
     */
    wxConfigLoader?: () => Promise<{
      appId: string
      timestamp: number
      nonceStr: string
      signature: string
      jsApiList?: string[]
    } | null>
    disabled?: boolean
    /** 是否显示「重新定位」按钮（默认 true） */
    relocateable?: boolean
    /** 打卡限制：'once'=仅一次，'multiple'=可多次（默认 'once'） */
    mode?: 'once' | 'multiple'
    modelValue?: CheckinResult | null
  }>(),
  {
    title: '外出定位打卡',
    mapKey: (import.meta.env.VITE_TMAP_KEY as string) || '',
    autoLocate: true,
    locateTimeout: 15000,
    useWxLocation: true,
    disabled: false,
    relocateable: true,
    mode: 'once',
    modelValue: null,
  },
)

const emit = defineEmits<{
  checkin: [result: CheckinResult]
  locate: [position: Position]
  locateError: [error: GeolocationPositionError | Error]
  'update:modelValue': [value: CheckinResult | null]
}>()

// ==================== 状态 ====================
const position = ref<Position>({ lat: 0, lng: 0 })
const locating = ref(false)
const located = ref(false)
const locateErrMsg = ref('')
/** 定位错误码：1=权限拒绝 2=无位置 3=超时 */
const locateErrCode = ref<number | null>(null)
/** 定位来源：gps=浏览器高精度 wx=微信 ip=腾讯 IP 兜底 */
const locateSource = ref<'' | 'gps' | 'wx' | 'ip'>('')
/** 逆地址编码得到的地址文本 */
const address = ref('')
const mapInitErr = ref('')
const mapSdkMissing = ref(false)
const checkedIn = ref(false)
const currentTime = ref(formatTime(new Date()))
const firstTime = ref('')
const lastTime = ref('')
const history = ref<CheckinResult[]>([])
const mapContainer = ref<HTMLElement>()

let mapInstance: any = null
let markerInstance: any = null
let clockTimer: ReturnType<typeof setInterval> | null = null

/** 是否微信/企业微信环境（HTML5 定位常不可用，需 wx.getLocation） */
const isWeChat = /MicroMessenger/i.test(typeof navigator !== 'undefined' ? navigator.userAgent : '')

// ==================== 计算属性 ====================
const hasMap = computed(() => !!props.mapKey)
const ringColor = computed(() => (checkedIn.value ? '#07c160' : '#1989fa'))

/** 是否允许打卡：multiple 模式始终允许；once 模式仅首次 */
const canCheckin = computed(() => props.mode === 'multiple' || !checkedIn.value)
/** 打卡按钮主文案 */
const checkinBtnText = computed(() =>
  checkedIn.value ? lastTime.value || currentTime.value : '打卡',
)
/** 打卡按钮副文案 */
const checkinBtnSub = computed(() => {
  if (!checkedIn.value) return '点击定位打卡'
  return props.mode === 'multiple' ? '已打卡·可再次打卡' : '已打卡（仅限一次）'
})

/** 根据定位错误码给出用户友好提示 */
const locateHint = computed(() => {
  const code = locateErrCode.value
  const msg = locateErrMsg.value
  if (code === 1 || msg.includes('denied') || msg.includes('permission'))
    return '位置权限被拒绝：请点击地址栏左侧的「位置」图标，将权限改为“允许”后点击重新定位'
  if (code === 2)
    return isWeChat
      ? '微信内 HTML5 定位不可用（系统无法取位）。企业微信需调用 wx.getLocation，请在微信中开启定位权限或联系开发接入 JS-SDK'
      : '系统无法获取位置信息：请确认设备「位置信息 / GPS」已开启'
  if (code === 3 || msg.includes('Timeout') || msg.includes('expired'))
    return isWeChat
      ? '微信内定位超时：HTML5 定位在微信 webview 通常不可用，需改用 wx.getLocation（JS-SDK）'
      : '定位请求超时：设备获取位置耗时过长，请确认 GPS/网络定位可用，或点击重新定位'
  return '请确认网络正常且允许位置权限后重试'
})

// ==================== 方法 ====================
function formatTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** 写入定位结果：更新坐标、标记完成、逆地址编码填充地址 */
async function applyPosition(pos: Position) {
  position.value = pos
  located.value = true
  locating.value = false
  emit('locate', pos)
  address.value = '解析中...'
  address.value = await reverseGeocode(pos.lat, pos.lng)
}

/** 动态加载腾讯地图 GL JS SDK（优先使用，避免依赖 index.html 注入） */
function loadTMapSdk(key: string): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as any).TMap) {
      resolve((window as any).TMap)
      return
    }
    const script = document.createElement('script')
    // libraries=service 用于逆地址编码
    script.src = `https://map.qq.com/api/gljs?v=1.exp&key=${encodeURIComponent(
      key,
    )}&libraries=service`
    script.async = true
    script.onload = () => {
      if ((window as any).TMap) resolve((window as any).TMap)
      else reject(new Error('腾讯地图 SDK 加载完成但 TMap 不可用'))
    }
    script.onerror = () => reject(new Error('腾讯地图 SDK 脚本加载失败（网络不可达）'))
    document.head.appendChild(script)
  })
}

/** 等待/加载腾讯地图 SDK */
async function waitForTMap(timeout = 8000): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).TMap) return
  await loadTMapSdk(props.mapKey)
  // 简单超时保护：loadTMapSdk 内部 onerror 已处理失败，这里仅兜底
  void timeout
}

/** 动态加载微信 JS-SDK（jweixin） */
function loadWxSdk(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as any).wx) {
      resolve((window as any).wx)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js'
    script.onload = () => {
      if ((window as any).wx) resolve((window as any).wx)
      else reject(new Error('jweixin 加载后 wx 仍不可用'))
    }
    script.onerror = () => reject(new Error('微信 JS-SDK 脚本加载失败（网络不可达）'))
    document.head.appendChild(script)
  })
}

/** 微信环境定位：wx.getLocation（gcj02，适配腾讯地图） */
async function locateByWx(): Promise<Position> {
  const wx = await loadWxSdk()
  if (props.wxConfigLoader) {
    const cfg = await props.wxConfigLoader()
    if (cfg) {
      await new Promise<void>((resolve) => {
        wx.config({
          debug: false,
          appId: cfg.appId,
          timestamp: cfg.timestamp,
          nonceStr: cfg.nonceStr,
          signature: cfg.signature,
          jsApiList: cfg.jsApiList || ['getLocation'],
        })
        wx.ready(() => resolve())
        wx.error((e: any) => {
          console.warn('[VantCheckin] wx.config 失败:', e)
          resolve()
        })
      })
    }
  }
  return new Promise<Position>((resolve, reject) => {
    wx.getLocation({
      type: 'gcj02',
      success: (res: any) => {
        const pos: Position = { lat: res.latitude, lng: res.longitude }
        locateSource.value = 'wx'
        applyPosition(pos)
        resolve(pos)
      },
      fail: (err: any) => reject(new Error(err?.errMsg || 'wx.getLocation 失败')),
    })
  })
}

/** 动态加载腾讯地图定位组件（qq.maps.Geolocation，IP 定位兜底源） */
function loadGeoSdk(): Promise<any> {
  return new Promise((resolve, reject) => {
    const w = window as any
    if (w.qq?.maps?.Geolocation) {
      resolve(w.qq)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://3gimg.qq.com/lightmap/components/geolocation/geolocation.min.js'
    script.async = true
    script.onload = () => {
      if (w.qq?.maps?.Geolocation) resolve(w.qq)
      else reject(new Error('腾讯定位组件加载完成但 qq.maps.Geolocation 不可用'))
    }
    script.onerror = () => reject(new Error('腾讯定位组件脚本加载失败（网络不可达）'))
    document.head.appendChild(script)
  })
}

/** 兜底定位：腾讯地图定位组件（IP / 基站定位，返回 gcj02 坐标） */
async function locateByTencentGeo(): Promise<Position> {
  const qq = await loadGeoSdk()
  return new Promise<Position>((resolve, reject) => {
    try {
      const geolocation = new qq.maps.Geolocation(props.mapKey, 'VantCheckin')
      geolocation.getLocation(
        (pos: any) => {
          // pos.lat / pos.lng 为 gcj02，与腾讯地图一致；module 标识 'geolocation'|'ip'
          const p: Position = { lat: pos.lat, lng: pos.lng }
          locateSource.value = 'ip'
          applyPosition(p)
          resolve(p)
        },
        (err: any) => {
          reject(new Error(err?.message || '腾讯 IP 定位失败'))
        },
        { timeout: props.locateTimeout },
      )
    } catch (e) {
      reject(e instanceof Error ? e : new Error('腾讯定位组件初始化失败'))
    }
  })
}

/** 浏览器原生 HTML5 地理定位（需 GPS / 位置权限） */
function locateByHtml5(highAccuracy: boolean): Promise<Position> {
  return new Promise<Position>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (geoPos) => {
        const pos: Position = {
          lat: geoPos.coords.latitude,
          lng: geoPos.coords.longitude,
        }
        locateSource.value = 'gps'
        applyPosition(pos)
        resolve(pos)
      },
      (err) => reject(err),
      {
        enableHighAccuracy: highAccuracy,
        timeout: props.locateTimeout,
        maximumAge: 30000,
      },
    )
  })
}

/** 定位主流程：微信 → HTML5(GPS) → 腾讯 IP 定位（兜底） */
async function doLocate(highAccuracy = false): Promise<Position> {
  locating.value = true
  locateErrMsg.value = ''
  locateErrCode.value = null
  located.value = false
  locateSource.value = ''

  // 1) 微信环境优先走 wx.getLocation
  if (props.useWxLocation && isWeChat) {
    try {
      locateSource.value = 'wx'
      return await locateByWx()
    } catch (e: any) {
      console.warn('[VantCheckin] wx.getLocation 失败，回退 HTML5 定位:', e?.message || e)
    }
  }

  // 2) 浏览器原生 HTML5 定位（高精度 GPS）
  if (navigator.geolocation) {
    try {
      return await locateByHtml5(highAccuracy)
    } catch (e: any) {
      locateErrCode.value = (e as any).code ?? null
      console.warn('[VantCheckin] HTML5 定位失败，回退腾讯 IP 定位:', e?.message || e)
    }
  }

  // 3) 兜底：腾讯地图定位组件（IP / 基站定位）
  if (props.mapKey) {
    try {
      return await locateByTencentGeo()
    } catch (e: any) {
      console.warn('[VantCheckin] 腾讯 IP 定位失败:', e?.message || e)
    }
  }

  // 全部失败：抛出最终错误
  const finalErr = new Error(
    navigator.geolocation
      ? '定位失败：GPS、微信、IP 定位均不可用，请检查网络与位置权限'
      : '定位失败：浏览器不支持地理定位，且未配置腾讯地图 Key',
  )
  locateErrCode.value = (finalErr as any).code ?? null
  locateErrMsg.value = finalErr.message
  console.warn('[VantCheckin] 定位失败 err.code=', locateErrCode.value, 'isWeChat=', isWeChat)
  located.value = true
  locating.value = false
  emit('locateError', finalErr)
  throw finalErr
}

/** 重新定位（手动重试） */
async function retryLocate(): Promise<void> {
  try {
    await doLocate(!isWeChat)
  } catch {
    // 失败信息已写入 locateErrMsg
  }
}

/** 逆地理编码：经纬度 -> 地址 */
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  if (props.mapKey && typeof window !== 'undefined' && (window as any).TMap) {
    try {
      const TMap = (window as any).TMap
      const geocoder = new TMap.service.Geocoder()
      const result = await geocoder.getAddress({
        location: new TMap.LatLng(lat, lng),
      })
      if (result?.result?.address) return result.result.address
    } catch {
      // 逆编码失败走兜底
    }
  }
  return `${lat.toFixed(6)},${lng.toFixed(6)}`
}

/** 用上次打卡数据渲染预览（地图打点 + 地址 + 已打卡态） */
function applyModelValue(val: CheckinResult | null) {
  if (!val) return
  position.value = { lat: val.lat, lng: val.lng }
  address.value = val.address || ''
  located.value = true
  locateSource.value = ''
  checkedIn.value = true
  currentTime.value = val.time
  lastTime.value = val.time
  if (val.isFirst) firstTime.value = val.firstTime || val.time
  if (history.value.length === 0) history.value = [val]
}

/** 打卡 */
async function handleCheckin() {
  if (props.disabled || !canCheckin.value) return
  try {
    if (props.mode === 'multiple' || !located.value) {
      showToast({ message: '正在定位...', forbidClick: true })
      await doLocate()
    }
    const now = new Date()
    const addr = await reverseGeocode(position.value.lat, position.value.lng)
    const record: CheckinResult = {
      lat: position.value.lat,
      lng: position.value.lng,
      address: addr,
      timestamp: now.toISOString(),
      time: formatTime(now),
      isFirst: history.value.length === 0,
    }
    if (record.isFirst) {
      firstTime.value = record.time
      record.firstTime = record.time
    }
    lastTime.value = record.time
    checkedIn.value = true
    currentTime.value = record.time
    history.value.push(record)
    emit('update:modelValue', record)
    emit('checkin', record)
    showToast(`打卡成功 ${record.time}`)
  } catch (err: any) {
    showToast(err.message || '打卡失败')
    console.error('[VantCheckin] 打卡失败:', err)
  }
}

/** 重置打卡状态 */
function reset() {
  checkedIn.value = false
}

/** 地图中心对齐到当前坐标 */
function syncMapToPosition(pos: Position) {
  const TMap = (window as any).TMap
  if (!TMap || !mapInstance) return
  if (pos.lat && pos.lng) {
    const ll = new TMap.LatLng(pos.lat, pos.lng)
    mapInstance.setCenter(ll)
    markerInstance?.setGeometries([{ id: 'checkin-marker', styleId: 'marker', position: ll }])
  }
}

/** 初始化腾讯地图 */
function initTMap() {
  if (!mapContainer.value || !props.mapKey || !(window as any).TMap) return
  try {
    const TMap = (window as any).TMap
    const center =
      position.value.lat && position.value.lng
        ? new TMap.LatLng(position.value.lat, position.value.lng)
        : new TMap.LatLng(39.98412, 116.30748) // 默认北京
    mapInstance = new TMap.Map(mapContainer.value, {
      center,
      zoom: 16,
      viewMode: '2D',
    })
    markerInstance = new TMap.MultiMarker({
      map: mapInstance,
      styles: {
        marker: new TMap.MarkerStyle({
          width: 25,
          height: 35,
          anchor: { x: 12.5, y: 35 },
        }),
      },
      geometries: [{ id: 'checkin-marker', styleId: 'marker', position: center }],
    })
    // 若定位已先完成，立即对齐
    syncMapToPosition(position.value)
  } catch (e) {
    console.warn('[VantCheckin] 地图初始化失败:', e)
    mapInitErr.value = '地图初始化失败，但定位与打卡功能仍可用'
  }
}

/** 暴露给父组件设置地图中心 */
function setMapCenter(pos: Position) {
  position.value = pos
  syncMapToPosition(pos)
}

// 坐标变化即同步地图（immediate 确保初始化时若坐标已就绪也能对齐）
watch(
  () => position.value,
  (pos) => syncMapToPosition(pos),
  { immediate: true },
)

// 父组件传入/更新上次打卡数据时，同步预览
watch(
  () => props.modelValue,
  (val) => {
    if (val) applyModelValue(val)
  },
)

// ==================== 生命周期 ====================
onMounted(async () => {
  clockTimer = setInterval(() => {
    currentTime.value = formatTime(new Date())
  }, 1000)

  // 已存在上次打卡数据：用其预览地图，跳过自动定位
  if (props.modelValue) {
    applyModelValue(props.modelValue)
  }

  if (props.mapKey) {
    try {
      await waitForTMap()
      await nextTick()
      initTMap()
    } catch (e) {
      mapSdkMissing.value = true
      console.warn('[VantCheckin] 腾讯地图 SDK 未加载:', (e as Error).message)
    }
  }

  if (props.autoLocate && !props.modelValue) {
    try {
      await doLocate()
    } catch {
      // 定位失败不阻塞 UI
    }
  }
})

onBeforeUnmount(() => {
  if (clockTimer) clearInterval(clockTimer)
  if (mapInstance) {
    mapInstance.destroy?.()
    mapInstance = null
  }
})

// ==================== 暴露 ====================
defineExpose({
  doLocate,
  retryLocate,
  initTMap,
  setMapCenter,
  reset,
  position: readonly(position),
  checkedIn: readonly(checkedIn),
  history: readonly(history),
})
</script>

<template>
  <div class="vc-checkin">
    <!-- 导航栏 -->
    <van-nav-bar :title="title" />

    <!-- 地图区域 -->
    <div class="vc-map-wrap">
      <div ref="mapContainer" class="vc-map-container"></div>

      <!-- 定位中遮罩 -->
      <div v-if="locating" class="vc-map-mask">
        <van-loading color="#fff" size="28" vertical>定位中...</van-loading>
      </div>

      <!-- 地图初始化失败 -->
      <div v-else-if="mapInitErr" class="vc-map-mask vc-map-mask--light">
        <span class="vc-loc-error">{{ mapInitErr }}</span>
      </div>

      <!-- SDK 未加载（无 Key 或脚本被拦截） -->
      <div v-else-if="mapSdkMissing" class="vc-map-mask vc-map-mask--light">
        <span class="vc-loc-error">腾讯地图 SDK 未加载</span>
        <p class="vc-map-hint">
          请确认 .env 的 VITE_TMAP_KEY 为有效的「JavaScript API GL」类型 Key
        </p>
      </div>

      <!-- 已定位但无 Key（纯坐标模式） -->
      <div v-else-if="!hasMap && located" class="vc-map-mask vc-map-mask--light">
        <span class="vc-coords-inline">
          {{ position.lat.toFixed(6) }} , {{ position.lng.toFixed(6) }}
        </span>
      </div>
    </div>

    <!-- 位置信息（紧凑） -->
    <div class="vc-info">
      <!-- 坐标栏 + 重新定位 -->
      <div class="vc-coord-bar">
        <div class="vc-coord">
          <van-icon name="location-o" class="vc-coord-icon" />
          <span class="vc-coord-text">
            {{ located ? `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}` : '未定位' }}
          </span>
        </div>
        <div class="vc-coord-actions">
          <span
            v-if="located && locateSource === 'ip'"
            class="vc-ip-badge"
            title="IP 定位，精度约城市/街区级"
            >⚠ IP定位</span
          >
          <van-button
            v-if="relocateable && (mode === 'multiple' || !checkedIn)"
            size="mini"
            type="primary"
            plain
            class="vc-relocate"
            :loading="locating"
            :disabled="disabled"
            @click="retryLocate"
            >重新定位</van-button
          >
        </div>
      </div>

      <!-- 地址（单行省略） -->
      <div class="vc-addr">
        <span class="vc-addr-label">地址</span>
        <span class="vc-addr-text">{{ located ? address || '解析中...' : '—' }}</span>
      </div>

      <!-- 定位错误提示 -->
      <div v-if="locateErrMsg" class="vc-loc-error-box">
        <span class="vc-loc-error">{{ locateErrMsg }}</span>
        <p class="vc-loc-hint">{{ locateHint }}</p>
      </div>
    </div>

    <!-- 打卡按钮 -->
    <div class="vc-action">
      <button
        class="vc-checkin-btn"
        :class="{ 'is-done': checkedIn }"
        :style="{ '--ring': ringColor }"
        :disabled="disabled || !canCheckin"
        @click="handleCheckin"
      >
        <span class="vc-checkin-time">{{ checkinBtnText }}</span>
        <span class="vc-checkin-sub">{{ checkinBtnSub }}</span>
      </button>
    </div>

    <!-- 打卡记录 -->
    <div v-if="history.length" class="vc-history">
      <div class="vc-history-title">打卡记录（{{ history.length }}）</div>
      <van-cell-group inset>
        <van-cell
          v-for="(r, i) in history"
          :key="i"
          :title="r.time"
          :label="r.address"
          :value="r.isFirst ? '首次' : ''"
        />
      </van-cell-group>
    </div>
  </div>
</template>

<style scoped>
.vc-checkin {
  background: #f7f8fa;
  min-height: 100vh;
  padding-bottom: 24px;
}

/* 地图 */
.vc-map-wrap {
  position: relative;
  width: 100%;
  height: 45vh;
  min-height: 260px;
  background: #eaeef2;
}
.vc-map-container {
  width: 100%;
  height: 100%;
}
.vc-map-mask {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  text-align: center;
  padding: 16px;
}
.vc-map-mask--light {
  background: rgba(247, 248, 250, 0.92);
  color: #323233;
}
.vc-map-hint {
  font-size: 12px;
  color: #969799;
  margin: 4px 0 0;
  line-height: 1.5;
}
.vc-coords-inline {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  color: #1989fa;
  background: #fff;
  padding: 6px 12px;
  border-radius: 6px;
}

/* 信息区 */
.vc-info {
  background: #fff;
  margin: 10px;
  border-radius: 12px;
  padding: 10px 14px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}
.vc-coord-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f2f3f5;
}
.vc-coord {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}
.vc-coord-icon {
  color: #1989fa;
  font-size: 16px;
  flex-shrink: 0;
}
.vc-coord-text {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: #323233;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.vc-relocate {
  flex-shrink: 0;
  height: 22px;
  padding: 0 8px;
  font-size: 11px;
  line-height: 20px;
}
.vc-coord-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.vc-ip-badge {
  display: inline-block;
  font-size: 10px;
  line-height: 16px;
  color: #ed6a0c;
  background: #fff7e8;
  border: 1px solid #fde2c1;
  border-radius: 8px;
  padding: 0 6px;
  white-space: nowrap;
}
.vc-addr {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-top: 8px;
  font-size: 13px;
  color: #646566;
}
.vc-addr-icon {
  color: #1989fa;
  font-size: 15px;
  flex-shrink: 0;
}
.vc-addr-label {
  flex-shrink: 0;
  color: #969799;
}
.vc-addr-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.vc-loc-error-box {
  margin-top: 8px;
  text-align: center;
}
.vc-loc-error {
  color: #ee0a24;
  font-size: 13px;
}
.vc-loc-hint {
  font-size: 12px;
  color: #969799;
  margin: 8px 0 0;
  line-height: 1.5;
}

/* 打卡按钮 */
.vc-action {
  display: flex;
  justify-content: center;
  margin: 20px 0;
}
.vc-checkin-btn {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  border: 6px solid var(--ring, #1989fa);
  background: #fff;
  color: var(--ring, #1989fa);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(25, 137, 250, 0.18);
  transition: transform 0.15s;
}
.vc-checkin-btn:active {
  transform: scale(0.96);
}
.vc-checkin-btn:disabled {
  opacity: 0.7;
  cursor: default;
}
.vc-checkin-btn.is-done {
  background: var(--ring);
  color: #fff;
}
.vc-checkin-time {
  font-size: 26px;
  font-weight: 700;
}
.vc-checkin-sub {
  font-size: 13px;
  margin-top: 6px;
  opacity: 0.85;
}

/* 记录 */
.vc-history {
  margin: 0 12px;
}
.vc-history-title {
  font-size: 14px;
  font-weight: 600;
  color: #323233;
  margin: 8px 4px;
}
</style>
