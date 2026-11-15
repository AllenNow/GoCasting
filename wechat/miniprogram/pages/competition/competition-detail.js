// pages/competition/competition-detail.js — 比赛详情 & 榜单
const app = getApp();

const STATUS_MAP = {
  upcoming: { label: '即将开始', color: '#4a90d9' },
  ongoing:  { label: '进行中',   color: '#1a7f5a' },
  finished: { label: '已结束',   color: '#999999' },
};

const MEDAL = ['🥇', '🥈', '🥉'];

Page({
  data: {
    competition: null,
    top3: [],     // 前三名
    rest: [],     // 第4名起
    loading: true,
    isAdmin: false,

    // ===== 选手面板（管理员用）=====
    showEntryPanel: false,
    editingEntryId: null,   // null = 新增
    saving: false,
    entryForm: {
      player_name: '',
      best_species: '',
      length_cm: '',
      total_weight_g: '',
      spot: '',
      note: '',
      photo_url: '',        // 图片云端URL
    },
    photoTempPath: '',      // 待上传的本地临时路径

    // ===== 撤销删除 =====
    lastDeleted: null,      // 最近删除的记录
    showUndoBar: false,     // 是否显示撤销提示
  },

  onLoad(options) {
    const { id } = options;
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'error' });
      wx.navigateBack();
      return;
    }
    this._id = id;
    this.setData({ isAdmin: app.globalData.isAdmin || false });
    this.loadCompetition(id);
  },

  onShow() {
    const checkAdmin = () => {
      if (app.globalData.openid) {
        this.setData({ isAdmin: app.globalData.isAdmin || false });
      } else {
        setTimeout(checkAdmin, 500);
      }
    };
    checkAdmin();
  },

  async loadCompetition(id) {
    this.setData({ loading: true });
    try {
      const db = app.globalData.db;
      const res = await db.collection('competitions').doc(id).get();
      const competition = res.data;

      wx.setNavigationBarTitle({ title: competition.name });

      // 排序规则：长度优先，长度相同时按重量
      const sorted = (competition.entries || [])
        .sort((a, b) => {
          // 先比较长度
          const lenA = a.length_cm || 0;
          const lenB = b.length_cm || 0;
          if (lenB !== lenA) return lenB - lenA;
          // 长度相同，比较重量
          return (b.total_weight_g || 0) - (a.total_weight_g || 0);
        })
        .map((e, i) => ({
          ...e,
          rank: i + 1,
          medal: i < 3 ? MEDAL[i] : String(i + 1),
          lengthDisplay: e.length_cm ? `${e.length_cm} cm` : '—',
          weightDisplay: e.total_weight_g 
            ? (e.total_weight_g >= 1000 ? `${(e.total_weight_g / 1000).toFixed(2)} kg` : `${e.total_weight_g} g`)
            : '待定',
          isTop3: i < 3,
        }));

      competition.entries = sorted;
      competition.statusLabel = STATUS_MAP[competition.status]?.label || competition.status;
      competition.statusColor = STATUS_MAP[competition.status]?.color || '#999';

      this.setData({
        competition,
        top3: sorted.slice(0, 3),
        rest: sorted.slice(3),
        loading: false,
      });
    } catch (err) {
      console.error('加载比赛详情失败', err);
      wx.showToast({ title: '加载失败', icon: 'error' });
      this.setData({ loading: false });
    }
  },

  // ===== 管理员操作 =====

  editCompetition() {
    wx.navigateTo({ url: `/pages/admin/competition-edit?id=${this._id}` });
  },

  deleteCompetition() {
    wx.showModal({
      title: '删除比赛',
      content: '确定删除这场比赛？所有成绩将一并删除，不可恢复。',
      confirmColor: '#e85555',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await app.globalData.db.collection('competitions').doc(this._id).remove();
          wx.showToast({ title: '已删除', icon: 'success' });
          setTimeout(() => wx.navigateBack(), 1000);
        } catch (err) {
          wx.showToast({ title: '删除失败', icon: 'error' });
        }
      },
    });
  },

  // ===== 选手面板 =====

  openAddEntry() {
    this.setData({
      showEntryPanel: true,
      editingEntryId: null,
      photoTempPath: '',
      entryForm: { player_name: '', best_species: '', length_cm: '', total_weight_g: '', spot: '', note: '', photo_url: '' },
    });
  },

  openEditEntry(e) {
    const id = e.currentTarget.dataset.id;
    const entries = this.data.competition.entries || [];
    const entry = entries.find(en => en.id === id);
    if (!entry) return;
    this.setData({
      showEntryPanel: true,
      editingEntryId: id,
      photoTempPath: '',
      entryForm: {
        player_name: entry.player_name || '',
        best_species: entry.best_species || '',
        length_cm: entry.length_cm ? String(entry.length_cm) : '',
        total_weight_g: entry.total_weight_g ? String(entry.total_weight_g) : '',
        spot: entry.spot || '',
        note: entry.note || '',
        photo_url: entry.photo_url || '',
      },
    });
  },

  closeEntryPanel() {
    this.setData({ showEntryPanel: false });
  },

  // 阻止冒泡（删除按钮用）
  stopPropagation() {},

  // ===== 图片上传 =====
  choosePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'], // 微信自动压缩
      success: async (res) => {
        const file = res.tempFiles[0];
        let tempPath = file.tempFilePath;
        const fileSize = file.size; // 字节

        // 如果超过 1MB，进一步压缩
        if (fileSize > 1024 * 1024) {
          wx.showLoading({ title: '压缩图片中…' });
          try {
            tempPath = await this.compressImage(tempPath, fileSize);
          } catch (err) {
            console.error('压缩失败:', err);
            wx.showToast({ title: '图片过大，压缩失败', icon: 'none' });
            wx.hideLoading();
            return;
          }
          wx.hideLoading();
        }

        this.setData({
          photoTempPath: tempPath,
          'entryForm.photo_url': tempPath,
        });
      },
    });
  },

  // 压缩图片到 1MB 以下
  compressImage(filePath, originalSize) {
    return new Promise((resolve, reject) => {
      // 计算压缩质量（目标 900KB，留点余量）
      const targetSize = 900 * 1024;
      let quality = Math.floor((targetSize / originalSize) * 100);
      quality = Math.max(20, Math.min(80, quality)); // 限制在 20-80 之间

      wx.compressImage({
        src: filePath,
        quality: quality,
        success: (res) => {
          // 检查压缩后大小
          wx.getFileInfo({
            filePath: res.tempFilePath,
            success: (info) => {
              if (info.size > 1024 * 1024) {
                // 还是太大，再压一次
                wx.compressImage({
                  src: res.tempFilePath,
                  quality: 20,
                  success: (res2) => resolve(res2.tempFilePath),
                  fail: reject,
                });
              } else {
                resolve(res.tempFilePath);
              }
            },
            fail: () => resolve(res.tempFilePath), // 获取大小失败就直接用
          });
        },
        fail: reject,
      });
    });
  },

  removePhoto() {
    this.setData({
      photoTempPath: '',
      'entryForm.photo_url': '',
    });
  },

  // 上传图片到云存储
  async uploadPhoto() {
    if (!this.data.photoTempPath) return this.data.entryForm.photo_url || '';
    const ext = this.data.photoTempPath.split('.').pop() || 'jpg';
    const cloudPath = `leaderboard_photos/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const res = await wx.cloud.uploadFile({
      cloudPath,
      filePath: this.data.photoTempPath,
    });
    return res.fileID;
  },

  onEntryInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`entryForm.${field}`]: e.detail.value });
  },

  async saveEntry() {
    if (this.data.saving) return;
    const { entryForm, editingEntryId } = this.data;

    if (!entryForm.player_name.trim()) {
      wx.showToast({ title: '请输入钓友昵称', icon: 'none' });
      return;
    }

    this.setData({ saving: true });
    wx.showLoading({ title: '保存中…' });

    try {
      // 上传图片（如果有新图片）
      const photoUrl = await this.uploadPhoto();

      const entry = {
        player_name: entryForm.player_name.trim(),
        best_species: entryForm.best_species.trim(),
        length_cm: entryForm.length_cm ? Number(entryForm.length_cm) : null,
        total_weight_g: entryForm.total_weight_g ? Number(entryForm.total_weight_g) : null,
        spot: entryForm.spot.trim(),
        note: entryForm.note.trim(),
        photo_url: photoUrl || null,
      };

      const res = await wx.cloud.callFunction({
        name: 'updateCompetition',
        data: {
          action: editingEntryId ? 'updateEntry' : 'addEntry',
          competitionId: this._id,
          entry,
          entryId: editingEntryId,
        },
      });

      if (res.result.success) {
        wx.showToast({ title: '保存成功', icon: 'success' });
        this.setData({ showEntryPanel: false, photoTempPath: '' });
        this.loadCompetition(this._id);
      } else {
        wx.showToast({ title: res.result.error || '保存失败', icon: 'none' });
      }
    } catch (err) {
      console.error('保存失败', err);
      wx.showToast({ title: '保存失败，请重试', icon: 'error' });
    } finally {
      wx.hideLoading();
      this.setData({ saving: false });
    }
  },

  deleteEntry(e) {
    const id = e.currentTarget.dataset.id;
    const entries = this.data.competition.entries || [];
    const entry = entries.find(en => en.id === id);
    
    wx.showModal({
      title: '删除记录',
      content: `确定删除 ${entry?.player_name || ''} 的记录吗？`,
      confirmColor: '#e85555',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          const result = await wx.cloud.callFunction({
            name: 'updateCompetition',
            data: {
              action: 'deleteEntry',
              competitionId: this._id,
              entryId: id,
            },
          });
          if (result.result.success) {
            // 保存删除的记录，用于撤销
            this.setData({
              lastDeleted: { ...entry, competitionId: this._id },
              showUndoBar: true,
            });
            // 5秒后自动隐藏撤销栏
            clearTimeout(this._undoTimer);
            this._undoTimer = setTimeout(() => {
              this.setData({ showUndoBar: false, lastDeleted: null });
            }, 5000);
            
            this.loadCompetition(this._id);
          } else {
            wx.showToast({ title: result.result.error || '删除失败', icon: 'error' });
          }
        } catch (err) {
          wx.showToast({ title: '删除失败', icon: 'error' });
        }
      },
    });
  },

  // 撤销删除
  async undoDelete() {
    const { lastDeleted } = this.data;
    if (!lastDeleted) return;

    wx.showLoading({ title: '恢复中…' });
    try {
      const entry = {
        player_name: lastDeleted.player_name,
        best_species: lastDeleted.best_species,
        length_cm: lastDeleted.length_cm,
        total_weight_g: lastDeleted.total_weight_g,
        spot: lastDeleted.spot,
        note: lastDeleted.note,
        photo_url: lastDeleted.photo_url,
      };

      const res = await wx.cloud.callFunction({
        name: 'updateCompetition',
        data: {
          action: 'addEntry',
          competitionId: lastDeleted.competitionId,
          entry,
        },
      });

      if (res.result.success) {
        wx.showToast({ title: '已恢复', icon: 'success' });
        this.setData({ showUndoBar: false, lastDeleted: null });
        clearTimeout(this._undoTimer);
        this.loadCompetition(this._id);
      } else {
        wx.showToast({ title: '恢复失败', icon: 'error' });
      }
    } catch (err) {
      wx.showToast({ title: '恢复失败', icon: 'error' });
    } finally {
      wx.hideLoading();
    }
  },

  dismissUndoBar() {
    this.setData({ showUndoBar: false, lastDeleted: null });
    clearTimeout(this._undoTimer);
  },

  // ===== 导出榜单图片 =====
  async exportImage() {
    const { competition } = this.data;
    if (!competition) return;

    wx.showLoading({ title: '生成图片…', mask: true });

    try {
      // 限制最多30条
      const entries = (competition.entries || []).slice(0, 30);
      const entryCount = entries.length;

      // 动态计算画布高度
      const W = 750;
      const headerH = 160;
      const rowH = 60;
      const footerH = 80;
      const H = headerH + entryCount * rowH + footerH;

      // 获取 canvas
      const canvas = await new Promise((resolve, reject) => {
        wx.createSelectorQuery()
          .select('#exportCanvas')
          .fields({ node: true, size: true })
          .exec(res => res[0]?.node ? resolve(res[0].node) : reject(new Error('canvas not found')));
      });

      const ctx = canvas.getContext('2d');
      const dpr = wx.getSystemInfoSync().pixelRatio;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.scale(dpr, dpr);

      // 背景
      ctx.fillStyle = '#f4f6f4';
      ctx.fillRect(0, 0, W, H);

      // 头部背景
      const grad = ctx.createLinearGradient(0, 0, W, headerH);
      grad.addColorStop(0, '#1a7f5a');
      grad.addColorStop(1, '#0d5c42');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, headerH);

      // 标题
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(competition.name, W / 2, 60);

      // 副标题
      ctx.font = '24px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      const subtitle = `${competition.date || ''} · ${competition.location || ''}`;
      ctx.fillText(subtitle, W / 2, 100);

      // 规则说明
      ctx.font = '20px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText('排名规则：长度优先，长度相同按重量', W / 2, 135);

      // 榜单列表
      ctx.textAlign = 'left';
      const startY = headerH + 20;

      entries.forEach((entry, i) => {
        const y = startY + i * rowH;

        // 奇偶行背景
        if (i % 2 === 0) {
          ctx.fillStyle = '#ffffff';
        } else {
          ctx.fillStyle = '#f9f9f9';
        }
        ctx.fillRect(20, y, W - 40, rowH - 4);

        // 前3名高亮背景
        if (i < 3) {
          ctx.fillStyle = i === 0 ? '#fff8e6' : (i === 1 ? '#f5f5f5' : '#fff5ee');
          ctx.fillRect(20, y, W - 40, rowH - 4);
        }

        // 排名
        ctx.fillStyle = i < 3 ? '#d4a000' : '#666666';
        ctx.font = i < 3 ? 'bold 28px sans-serif' : '26px sans-serif';
        const medal = i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : String(i + 1)));
        ctx.fillText(medal, 40, y + 38);

        // 姓名
        ctx.fillStyle = '#1a1a1a';
        ctx.font = i < 3 ? 'bold 26px sans-serif' : '26px sans-serif';
        ctx.fillText(entry.player_name || '—', 100, y + 38);

        // 鱼种 + 钓点
        ctx.fillStyle = '#999999';
        ctx.font = '20px sans-serif';
        const meta = [entry.best_species, entry.spot].filter(Boolean).join(' · ');
        ctx.fillText(meta, 280, y + 38);

        // 长度
        ctx.textAlign = 'right';
        ctx.fillStyle = '#1a7f5a';
        ctx.font = 'bold 26px sans-serif';
        const lengthStr = entry.length_cm ? `${entry.length_cm} cm` : '—';
        ctx.fillText(lengthStr, W - 140, y + 32);

        // 重量
        ctx.fillStyle = '#999999';
        ctx.font = '20px sans-serif';
        const weightStr = entry.total_weight_g 
          ? (entry.total_weight_g >= 1000 ? `${(entry.total_weight_g / 1000).toFixed(1)}kg` : `${entry.total_weight_g}g`)
          : '待定';
        ctx.fillText(weightStr, W - 40, y + 32);

        ctx.textAlign = 'left';
      });

      // 底部品牌
      ctx.textAlign = 'center';
      ctx.fillStyle = '#999999';
      ctx.font = '22px sans-serif';
      ctx.fillText('GoCasting · 远投钓鱼助手', W / 2, H - 30);

      // 导出图片
      const tempPath = await new Promise((res, rej) =>
        wx.canvasToTempFilePath({
          canvas,
          fileType: 'png',
          quality: 1,
          success: r => res(r.tempFilePath),
          fail: rej,
        })
      );

      wx.hideLoading();

      // 操作菜单
      wx.showActionSheet({
        itemList: ['保存到相册', '分享给好友'],
        success: (r) => {
          if (r.tapIndex === 0) {
            wx.saveImageToPhotosAlbum({
              filePath: tempPath,
              success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
              fail: () => wx.showToast({ title: '请授权相册权限', icon: 'none' }),
            });
          } else if (r.tapIndex === 1) {
            wx.shareFileMessage({
              filePath: tempPath,
              fileName: `${competition.name}_榜单.png`,
              fail: () => wx.previewImage({ urls: [tempPath] }),
            });
          }
        },
      });
    } catch (err) {
      wx.hideLoading();
      console.error('导出榜单图片失败', err);
      wx.showToast({ title: '生成失败，请重试', icon: 'error' });
    }
  },
});
