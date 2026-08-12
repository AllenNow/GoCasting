// pages/catch-log/catch-log.js — 渔获记录（新建 & 编辑）
const app = getApp();

const SPECIES_LIST = [
  // 鱚科
  '多鳞鱚（沙尖）', '少鳞鱚（银沙尖）',
  // 石首鱼科
  '白姑鱼', '皮氏叫姑鱼', '黄姑鱼', '棘头梅童鱼', '尖头黄鳍牙䱛',
  // 鲷科
  '黑棘鲷（黑鲷）', '黄鳍鲷', '平鲷',
  // 鲻科
  '鲻鱼', '鮻（梭鱼）',
  // 鲾科
  '短棘鲾', '项斑项鲾', '静鲾（仰口鲾）', '黄斑鲾',
  // 隆头鱼科
  '侧带海猪鱼', '云斑海猪鱼', '三斑海猪鱼', '棋盘海猪鱼（黄花龙）',
  // 其他
  '花身鯻', '多齿蛇鲻（狗母鱼）', '牙鲆（比目鱼）',
  '四指马鲅（午鱼）', '蓝圆鲹（巴浪鱼）', '矛尾复虾虎鱼',
  // 鳗鲡目
  '海鳗',
  // 甲壳类
  '三疣梭子蟹', '远海梭子蟹（兰花蟹）', '锈斑蟳（红花蟹）', '拟穴青蟹',
  // 头足类
  '日本枪乌贼（鱿鱼）', '曼氏无针乌贼（墨鱼）',
  '其他（自定义）',
];

const BAIT_OPTIONS = [
  // 虫饵（多毛纲，沙滩远投核心饵）
  '青沙蚕（青虫）',    // アオイソメ，青绿色，万能饵
  '粉虫（石沙蚕）',    // ジャリメ，粉红细虫，沙尖首选
  '赤虫',              // チロリ，鲜红色，夜钓石首鱼
  '本虫（岩虫）',      // イワイソメ，最粗最硬，黑鲷/石斑
  '海蛎虫',
  // 虾类
  '活虾', '虾肉', '腌制虾肉', '南极虾（冷冻）',
  // 鱼肉饵
  '温鱼肉', '巴浪鱼（整条/切片）', '鱿鱼肉', '猪肉条',
  // 其他天然饵
  '螃蟹', '贻贝', '小活鱼',
  // 素饵
  '面团',
];

const RIG_OPTIONS = ['天秤', '游动铅', '立て釣り', 'Hi-Lo', '浮标'];

const TIDE_OPTIONS = [
  { value: 'rising', label: '涨潮', icon: '🌊' },
  { value: 'falling', label: '退潮', icon: '↘️' },
  { value: 'high', label: '高潮', icon: '⬆️' },
  { value: 'low', label: '低潮', icon: '⬇️' },
];

Page({
  data: {
    isEdit: false,
    editId: null,
    saving: false,

    photoUrl: '',       // 本地或云端照片 URL
    photoTempPath: '',  // 待上传的本地临时路径

    speciesList: SPECIES_LIST,
    speciesIndex: -1,
    customSpecies: '',

    baitOptions: BAIT_OPTIONS,
    rigOptions: RIG_OPTIONS,
    tideOptions: TIDE_OPTIONS,

    form: {
      species: '',
      weight_g: '',
      date: '',
      time: '',
      location: '',
      bait: '',
      rig_type: '',
      tide_state: '',
      weather: '',
      released: false,
      notes: '',
    },
  },

  onLoad(options) {
    // 默认今天日期
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeNow = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    this.setData({
      'form.date': today,
      'form.time': timeNow,
    });

    // 编辑模式
    if (options.id) {
      this.setData({ isEdit: true, editId: options.id });
      wx.setNavigationBarTitle({ title: '编辑渔获' });
      this.loadRecord(options.id);
    } else {
      wx.setNavigationBarTitle({ title: '记录渔获' });
    }
  },

  // 加载已有记录（编辑模式）
  async loadRecord(id) {
    wx.showLoading({ title: '加载中…' });
    try {
      const db = app.globalData.db;
      const res = await db.collection('catch_logs').doc(id).get();
      const data = res.data;

      const speciesIndex = SPECIES_LIST.indexOf(data.species);
      let customSpecies = '';
      if (speciesIndex === -1 && data.species) {
        // 自定义鱼种
        customSpecies = data.species;
        this.setData({ speciesIndex: SPECIES_LIST.length - 1, customSpecies });
      } else {
        this.setData({ speciesIndex: Math.max(speciesIndex, 0) });
      }

      this.setData({
        photoUrl: data.photo_url || '',
        form: {
          species: data.species || '',
          weight_g: data.weight_g ? String(data.weight_g) : '',
          date: data.date || '',
          time: data.time || '',
          location: data.location || '',
          bait: data.bait || '',
          rig_type: data.rig_type || '',
          tide_state: data.tide_state || '',
          weather: data.weather || '',
          released: data.released || false,
          notes: data.notes || '',
        },
      });
    } catch (err) {
      console.error('加载记录失败', err);
      wx.showToast({ title: '加载失败', icon: 'error' });
    } finally {
      wx.hideLoading();
    }
  },

  // ========== 照片处理 ==========

  choosePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath;
        this.setData({
          photoTempPath: tempPath,
          photoUrl: tempPath,
        });
      },
    });
  },

  changePhoto() {
    this.choosePhoto();
  },

  // 上传照片到云存储，返回云路径
  async uploadPhoto() {
    if (!this.data.photoTempPath) return this.data.photoUrl || '';
    const ext = this.data.photoTempPath.split('.').pop() || 'jpg';
    const cloudPath = `catch_photos/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const res = await wx.cloud.uploadFile({
      cloudPath,
      filePath: this.data.photoTempPath,
    });
    return res.fileID;
  },

  // ========== 表单字段 ==========

  onSpeciesChange(e) {
    const idx = Number(e.detail.value);
    const species = idx < SPECIES_LIST.length - 1 ? SPECIES_LIST[idx] : '';
    this.setData({
      speciesIndex: idx,
      'form.species': species,
    });
  },

  onCustomSpeciesInput(e) {
    this.setData({
      customSpecies: e.detail.value,
      'form.species': e.detail.value,
    });
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({ [`form.${field}`]: value });
    // 重量输入时同步计算 kg 显示
    if (field === 'weight_g' && value) {
      this.setData({ 'form.weightKg': (Number(value) / 1000).toFixed(2) });
    }
  },

  onDateChange(e) {
    this.setData({ 'form.date': e.detail.value });
  },

  onTimeChange(e) {
    this.setData({ 'form.time': e.detail.value });
  },

  onBaitSelect(e) {
    const bait = e.currentTarget.dataset.bait;
    this.setData({ 'form.bait': this.data.form.bait === bait ? '' : bait });
  },

  onRigSelect(e) {
    const rig = e.currentTarget.dataset.rig;
    this.setData({ 'form.rig_type': this.data.form.rig_type === rig ? '' : rig });
  },

  onTideSelect(e) {
    const tide = e.currentTarget.dataset.tide;
    this.setData({ 'form.tide_state': this.data.form.tide_state === tide ? '' : tide });
  },

  onReleaseChange(e) {
    this.setData({ 'form.released': e.detail.value });
  },

  // 获取当前位置
  getLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (pos) => {
        // 用逆地理编码获取地址（腾讯位置服务）
        // 简化处理：直接存坐标字符串，也可接 API 获取地址名
        this.setData({
          'form.lat': pos.latitude,
          'form.lon': pos.longitude,
        });
        wx.showToast({ title: '位置已获取', icon: 'success' });
      },
      fail: () => {
        wx.showToast({ title: '获取位置失败', icon: 'error' });
      },
    });
  },

  // ========== 保存 ==========

  async saveCatch() {
    if (this.data.saving) return;

    // 校验必填
    const { form } = this.data;
    if (!form.species) {
      wx.showToast({ title: '请选择鱼种', icon: 'none' }); return;
    }
    if (!form.date) {
      wx.showToast({ title: '请选择日期', icon: 'none' }); return;
    }

    this.setData({ saving: true });
    wx.showLoading({ title: '保存中…' });

    try {
      const db = app.globalData.db;

      // 上传照片
      const photoUrl = await this.uploadPhoto();

      const record = {
        species: form.species,
        weight_g: form.weight_g ? Number(form.weight_g) : null,
        date: form.date,
        time: form.time || null,
        location: form.location || null,
        lat: form.lat || null,
        lon: form.lon || null,
        bait: form.bait || null,
        rig_type: form.rig_type || null,
        tide_state: form.tide_state || null,
        weather: form.weather || null,
        released: form.released,
        notes: form.notes || null,
        photo_url: photoUrl || null,
        openid: app.globalData.openid || null,   // 显式记录用户 openid
        updated_at: db.serverDate(),
      };

      if (this.data.isEdit) {
        await db.collection('catch_logs').doc(this.data.editId).update({ data: record });
        wx.showToast({ title: '更新成功', icon: 'success' });
      } else {
        record.created_at = db.serverDate();
        await db.collection('catch_logs').add({ data: record });
        wx.showToast({ title: '保存成功', icon: 'success' });
      }

      setTimeout(() => wx.navigateBack(), 1200);
    } catch (err) {
      console.error('保存失败', err);
      wx.showToast({ title: '保存失败，请重试', icon: 'error' });
    } finally {
      wx.hideLoading();
      this.setData({ saving: false });
    }
  },

  // ========== 删除 ==========

  deleteCatch() {
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定删除这条渔获记录吗？',
      confirmColor: '#e85555',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await app.globalData.db.collection('catch_logs').doc(this.data.editId).remove();
          wx.showToast({ title: '已删除', icon: 'success' });
          setTimeout(() => wx.navigateBack(), 1000);
        } catch (err) {
          wx.showToast({ title: '删除失败', icon: 'error' });
        }
      },
    });
  },

  // ========== 分享卡片 ==========

  async shareCard() {
    const { form, photoUrl } = this.data;
    if (!form.species) {
      wx.showToast({ title: '请先保存渔获记录', icon: 'none' }); return;
    }
    wx.showLoading({ title: '生成分享图…', mask: true });

    try {
      const W = 750, H = 1000;

      // 1. 获取 canvas 上下文（type=2d）
      const canvas = await new Promise((resolve, reject) => {
        wx.createSelectorQuery()
          .select('#shareCanvas')
          .fields({ node: true, size: true })
          .exec(res => res[0]?.node ? resolve(res[0].node) : reject(new Error('canvas not found')));
      });

      const ctx = canvas.getContext('2d');
      const dpr = wx.getSystemInfoSync().pixelRatio;
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      ctx.scale(dpr, dpr);

      // 2. 背景渐变
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#1a7f5a');
      grad.addColorStop(0.4, '#0d5c42');
      grad.addColorStop(1, '#091f17');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // 3. 装饰圆
      ctx.beginPath();
      ctx.arc(W - 60, 120, 180, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(80, H - 100, 120, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fill();

      // 4. 照片（如果有）
      let photoDrawn = false;
      if (photoUrl) {
        try {
          const imgInfo = await new Promise((res, rej) => {
            wx.getImageInfo({ src: photoUrl, success: res, fail: rej });
          });
          const img = canvas.createImage();
          await new Promise((res, rej) => {
            img.onload  = res;
            img.onerror = rej;
            img.src     = imgInfo.path;
          });
          // 圆角矩形裁剪
          const iw = 320, ih = 320, ix = (W - iw) / 2, iy = 160;
          ctx.save();
          this._roundRect(ctx, ix, iy, iw, ih, 24);
          ctx.clip();
          ctx.drawImage(img, ix, iy, iw, ih);
          ctx.restore();
          // 边框
          ctx.strokeStyle = 'rgba(255,255,255,0.3)';
          ctx.lineWidth = 3;
          this._roundRect(ctx, ix, iy, iw, ih, 24);
          ctx.stroke();
          photoDrawn = true;
        } catch (e) { /* 照片加载失败，跳过 */ }
      }

      const textStartY = photoDrawn ? 530 : 240;

      // 5. 鱼种（大字）
      ctx.fillStyle = '#ffffff';
      ctx.font      = `bold ${76}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(form.species || '未知鱼种', W / 2, textStartY);

      // 6. 重量
      if (form.weight_g) {
        const wStr = form.weight_g >= 1000
          ? `${(form.weight_g / 1000).toFixed(2)} kg`
          : `${form.weight_g} g`;
        ctx.font      = `bold ${48}px sans-serif`;
        ctx.fillStyle = '#a8e6c8';
        ctx.fillText(wStr, W / 2, textStartY + 72);
      }

      // 7. 元信息行
      const meta = [form.date, form.location, form.bait ? `饵：${form.bait}` : '']
        .filter(Boolean).join('  ·  ');
      ctx.font      = `${28}px sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.fillText(meta, W / 2, textStartY + 140);

      // 8. 放流标签
      if (form.released) {
        const lx = W / 2, ly = textStartY + 195;
        ctx.font      = `${26}px sans-serif`;
        ctx.fillStyle = '#52d9a0';
        ctx.fillText('🐟 已放流，守护渔业资源', lx, ly);
      }

      // 9. 底部品牌
      ctx.font      = `bold ${32}px sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText('GoCasting — 远投钓鱼助手', W / 2, H - 60);

      // 10. 导出为临时图片
      const tempPath = await new Promise((res, rej) =>
        wx.canvasToTempFilePath({
          canvas, fileType: 'jpg', quality: 0.92,
          success: r => res(r.tempFilePath),
          fail: rej,
        })
      );

      wx.hideLoading();

      // 11. 弹出操作菜单
      wx.showActionSheet({
        itemList: ['保存到相册', '分享给朋友'],
        success: (r) => {
          if (r.tapIndex === 0) {
            wx.saveImageToPhotosAlbum({
              filePath: tempPath,
              success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
              fail: () => wx.showToast({ title: '保存失败，请授权相册权限', icon: 'none' }),
            });
          } else if (r.tapIndex === 1) {
            wx.shareFileMessage({
              filePath: tempPath,
              fileName: `GoCasting_${form.species}_${form.date}.jpg`,
              fail: () => {
                // 降级：让用户长按保存
                wx.previewImage({ urls: [tempPath] });
              },
            });
          }
        },
      });
    } catch (err) {
      wx.hideLoading();
      console.error('生成分享卡片失败', err);
      wx.showToast({ title: '生成失败，请重试', icon: 'error' });
    }
  },

  // 辅助：绘制圆角矩形路径
  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  },
});
