// 推荐出钓日：展示前三名，点击联动潮汐日历
Component({
  properties: {
    items: { type: Array, value: [] },
  },
  methods: {
    onSelect(e) {
      const { date, index } = e.currentTarget.dataset;
      if (!date) return;
      this.triggerEvent('select', { date, index });
    },
  },
});
