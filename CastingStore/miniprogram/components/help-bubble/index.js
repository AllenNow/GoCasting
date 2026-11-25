import { getTopic } from '../../utils/help'

Component({
  properties: {
    // 帮助主题 key，对应 utils/help.js 中的 TOPICS
    topic: { type: String, value: '' },
    // 内联模式：渲染成页面中的小胶囊按钮，而不是右下角悬浮按钮
    inline: { type: Boolean, value: false },
    // 内联模式的文字，默认「说明」
    label: { type: String, value: '' },
    // 悬浮按钮距底部距离，避免压住 tabBar 或底部操作栏
    bottom: { type: String, value: '180rpx' },
  },

  data: {
    open: false,
    content: null,
  },

  observers: {
    topic(value) {
      this.refresh(value)
    },
  },

  lifetimes: {
    attached() {
      this.refresh(this.data.topic)
    },
  },

  methods: {
    refresh(topic) {
      if (!topic) return
      this.setData({ content: getTopic(topic) })
    },

    onOpen() {
      if (!this.data.content) this.refresh(this.data.topic)
      this.setData({ open: true })
    },

    onClose() {
      this.setData({ open: false })
    },

    // 阻止遮罩层滚动穿透与面板点击冒泡
    noop() {},
  },
})
