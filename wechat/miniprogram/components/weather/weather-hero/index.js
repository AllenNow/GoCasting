// 顶部实况卡：地点 / 潮汐状态 / 四格数据 / 今日洞察
// 数据全部由页面传入，交互仅向上抛出事件
Component({
  properties: {
    activePlace: { type: Object, value: null },
    city: { type: String, value: '' },
    isLocating: { type: Boolean, value: false },
    weather: { type: Object, value: null },
    currentData: { type: Object, value: null },
    seaLevelDatum: { type: String, value: 'msl' },
    fishScore: { type: null, value: null },
    nextTide: { type: Object, value: null },
    weatherAgeText: { type: String, value: '--' },
    marineAgeText: { type: String, value: '--' },
    refreshingFast: { type: Boolean, value: false },
    refreshingMarine: { type: Boolean, value: false },
    marineLoaded: { type: Boolean, value: false },
    todayBestWindows: { type: Array, value: [] },
    todayGrade: { type: Object, value: null },
    moonInfo: { type: Object, value: null },
    tideTypeInfo: { type: Object, value: null },
    tideRange: { type: null, value: null },
    pressureNow: { type: null, value: null },
    pressureTrend: { type: String, value: '' },
    gangHaiScore: { type: Number, value: 0 },
    tideConfidence: { type: Object, value: null },
    tideMeta: { type: Object, value: null },
  },

  methods: {
    onOpenPlace() { this.triggerEvent('openplace'); },
    onRefreshFast() { this.triggerEvent('refreshfast'); },
    onOpenDetail() { this.triggerEvent('opendetail'); },
    onRefreshMarine() { this.triggerEvent('refreshmarine'); },
  },
});
