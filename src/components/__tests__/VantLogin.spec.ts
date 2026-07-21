import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'

// mock 登录 API（网络层），让真实 composable 逻辑跑通且可控
vi.mock('@/api/modules/login', () => ({
  getLoginConfig: vi.fn(async () => ({
    enabledMethods: ['sms', 'password', 'wechat', 'wecom'],
    defaultMethod: 'sms',
    title: '后端标题',
    subtitle: '后端副标题',
  })),
  getCaptcha: vi.fn(async () => ({ captchaId: 'cid', svg: '<svg />' })),
  sendSmsCode: vi.fn(async () => ({ devCode: '123456' })),
  loginBySms: vi.fn(async () => ({ token: 'tok', user: { id: 1 } })),
  loginByPassword: vi.fn(async () => ({ token: 'tok', user: { id: 1 } })),
  getWechatAuthorizeUrl: vi.fn(async () => ({ url: 'https://wx' })),
  getWecomAuthorizeUrl: vi.fn(async () => ({ url: 'https://wxwork' })),
  resetPassword: vi.fn(async () => ({})),
}))

// 测试中移除 vant 运行库（toast 等副作用），全部降级为 no-op
vi.mock('vant', () => new Proxy({}, { get: () => vi.fn() }))

import VantLogin from '../VantLogin.vue'
import * as loginApi from '@/api/modules/login'

const loginApiMock = loginApi as Record<string, ReturnType<typeof vi.fn>>

function mountLogin(props: Record<string, any> = {}) {
  return shallowMount(VantLogin, { props: props as any })
}

beforeEach(() => {
  // jsdom 下 window.open 默认不存在，OAuth 弹窗分支需要先 stub
  ;(window as any).open = vi.fn(() => ({ closed: false, close: vi.fn() }))
  sessionStorage.clear()
})

describe('VantLogin', () => {
  it('挂载后拉取后端配置并渲染标题/副标题', async () => {
    const wrapper = mountLogin()
    await flushPromises()
    await wrapper.vm.$nextTick()
    expect(loginApiMock.getLoginConfig).toHaveBeenCalled()
    expect(wrapper.find('.login-title').text()).toBe('后端标题')
    expect(wrapper.find('.login-subtitle').text()).toBe('后端副标题')
  })

  it('挂载时拉取密码登录图形验证码', async () => {
    const wrapper = mountLogin()
    await flushPromises()
    expect(loginApiMock.getCaptcha).toHaveBeenCalled()
    expect((wrapper.vm as any).captchaSvg).toBe('<svg />')
  })

  it('默认渲染验证码 + 密码两个 Tab', () => {
    const wrapper = mountLogin()
    const tabs = wrapper.findAll('.card-tab')
    expect(tabs.length).toBe(2)
    expect(tabs[0].text()).toContain('验证码')
    expect(tabs[1].text()).toContain('密码')
  })

  it('点击密码 Tab 切换 activeMethod 为 password', async () => {
    const wrapper = mountLogin()
    await wrapper.findAll('.card-tab')[1].trigger('click')
    await wrapper.vm.$nextTick()
    expect((wrapper.vm as any).activeMethod).toBe('password')
  })

  it('底部渲染微信/企业微信 OAuth 入口，点击触发 onOAuth', async () => {
    const wrapper = mountLogin()
    const oauthBtns = wrapper.findAll('.oauth-icon-btn')
    expect(oauthBtns.length).toBe(2)
    await oauthBtns[0].trigger('click')
    await flushPromises()
    expect(loginApiMock.getWechatAuthorizeUrl).toHaveBeenCalled()
  })

  it('点击「忘记密码」打开找回弹窗（showForgot 置真）', async () => {
    const wrapper = mountLogin()
    await wrapper.find('.forgot-link').trigger('click')
    await wrapper.vm.$nextTick()
    expect((wrapper.vm as any).showForgot).toBe(true)
  })

  it('enabledMethods 仅 sms 时：隐藏 Tab 与 OAuth 入口', () => {
    const wrapper = mountLogin({ enabledMethods: ['sms'] })
    expect(wrapper.findAll('.card-tab').length).toBe(0)
    expect(wrapper.find('.other-login').exists()).toBe(false)
  })

  it('props.title 优先于后端配置', async () => {
    const wrapper = mountLogin({ title: '自定义标题' })
    await flushPromises()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.login-title').text()).toBe('自定义标题')
  })

  it('短信验证码登录成功派发 success 事件', async () => {
    const wrapper = mountLogin()
    const vm = wrapper.vm as any
    vm.smsForm.phone = '13800000000'
    vm.smsForm.code = '123456'
    await vm.onSmsSubmit()
    await flushPromises()
    const success = wrapper.emitted('success')
    expect(success).toBeTruthy()
    expect(loginApiMock.loginBySms).toHaveBeenCalledWith('13800000000', '123456')
  })

  it('短信验证码登录：手机号非法时不派发', async () => {
    const wrapper = mountLogin()
    const vm = wrapper.vm as any
    vm.smsForm.phone = '123'
    vm.smsForm.code = '123456'
    await vm.onSmsSubmit()
    await flushPromises()
    expect(wrapper.emitted('success')).toBeFalsy()
    expect(loginApiMock.loginBySms).not.toHaveBeenCalled()
  })

  it('密码登录：缺图形验证码时不派发', async () => {
    const wrapper = mountLogin()
    const vm = wrapper.vm as any
    vm.pwdForm.account = 'zhangsan'
    vm.pwdForm.password = '123456'
    vm.pwdForm.captcha = ''
    await vm.onPasswordSubmit()
    await flushPromises()
    expect(wrapper.emitted('success')).toBeFalsy()
    expect(loginApiMock.loginByPassword).not.toHaveBeenCalled()
  })
})
