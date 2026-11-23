// 选中天的鱼口模块：建议垂钓时段 + 无窗口提示 + 逐小时热力图
Component({
  properties: {
    windows: { type: Array, value: [] },
    isPast: { type: Boolean, value: false },
    heatmap: { type: Array, value: [] },
  },

  methods: {
    onAddWindow(e) {
      this.triggerEvent('addwindow', { idx: e.currentTarget.dataset.idx });
    },
  },
});
