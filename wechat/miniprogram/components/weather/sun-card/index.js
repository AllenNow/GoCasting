// 天光与黄金档：日出日落弧线 + 黄金档 + 月升月落 + 出钓指数
Component({
  properties: {
    daylight: { type: Object, value: null },
    astroAgeText: { type: String, value: '--' },
    moonTimes: { type: Object, value: null },
    goScore: { type: null, value: '--' },
    goScoreLevel: { type: String, value: '' },
    goScoreReady: { type: Boolean, value: false },
    minutelyText: { type: String, value: '' },
    minutelyHasRain: { type: Boolean, value: false },
    goldenActive: { type: String, value: '' },
  },

  methods: {
    onGoldenTap(e) {
      const key = e.currentTarget.dataset.key;
      if (!key) return;
      this.triggerEvent('goldentap', { key });
    },
    onGoScore() {
      this.triggerEvent('goscore');
    },
  },
});
