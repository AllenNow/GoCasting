// custom-tab-bar/index.js (ES5 兼容版)
Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: 'pages/weather/weather',
        text: '潮汐',
        icon:       '🌊',
        iconActive: '🌊',
      },
      {
        pagePath: 'pages/competition/competition',
        text: '榜单',
        icon:       '🏆',
        iconActive: '🏆',
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
    onTap: function(e) {
      var index = e.currentTarget.dataset.index;
      var path = e.currentTarget.dataset.path;
      if (index === this.data.selected) return;
      this.setData({ selected: index });
      wx.switchTab({ url: '/' + path });
    },

    // 供各 tabBar 页面调用，同步高亮状态
    init: function() {
      var pages = getCurrentPages();
      var currentPage = pages[pages.length - 1];
      var route = currentPage ? currentPage.route : '';
      var list = this.data.list;
      var index = -1;
      for (var i = 0; i < list.length; i++) {
        if (list[i].pagePath === route) {
          index = i;
          break;
        }
      }
      if (index !== -1) {
        this.setData({ selected: index });
      }
    },
  },
});
