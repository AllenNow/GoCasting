// custom-tab-bar/index.js
Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: 'pages/index/index',
        text: '渔获',
        icon:       '🐟',
        iconActive: '🎣',
      },
      {
        pagePath: 'pages/gear/gear',
        text: '装备',
        icon:       '🪄',
        iconActive: '🎯',
      },
      {
        pagePath: 'pages/spot-map/spot-map',
        text: '钓点',
        icon:       '📍',
        iconActive: '🗺️',
      },
      {
        pagePath: 'pages/profile/profile',
        text: '我的',
        icon:       '👤',
        iconActive: '🧑',
      },
    ],
  },

  methods: {
    onTap(e) {
      const { index, path } = e.currentTarget.dataset;
      if (index === this.data.selected) return;
      this.setData({ selected: index });
      wx.switchTab({ url: '/' + path });
    },

    // 供各 tabBar 页面调用，同步高亮状态
    init() {
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      const route = currentPage ? currentPage.route : '';
      const index = this.data.list.findIndex(item => item.pagePath === route);
      if (index !== -1) {
        this.setData({ selected: index });
      }
    },
  },
});
