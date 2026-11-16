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
    top3: [],
    rest: [],
    loading: true,
    isAdmin: false,
    canEdit: false,
    canDelete: false,
    canAssign: false,
    isCreator: false,
    isSuperAdmin: false,
    showEntryPanel: false,
    editingEntryId: null,
    editingPendingId: null,
    isUserSubmit: false,
    // 详情查看面板
    showDetailPanel: false,
    detailEntry: null,
    saving: false,
    entryForm: {
      player_name: '',
      best_species: '',
      length_cm: '',
      total_weight_g: '',
      spot: '',
      note: '',
      photo_url: '',
      catch_photo_url: '',
      spot_photo1_url: '',
      spot_photo2_url: '',
      catch_date: '',
      catch_time: '',
      tide_direction: '',
      tide_score: '',
      tide_type: '',
      spot_lat: '',
      spot_lon: '',
    },
    photoTempPath: '',
    // 三张图片的临时路径
    catchPhotoTemp: '',
    spotPhoto1Temp: '',
    spotPhoto2Temp: '',
    // 潮水选择
    tideDirectionOptions: [
      { label: '涨潮', value: 'rising' },
      { label: '退潮', value: 'falling' },
    ],
    tideTypeOptions: [
      { label: '大潮', value: 'big' },
      { label: '中潮', value: 'medium' },
      { label: '小潮', value: 'small' },
    ],
    tideScoreOptions: [1,2,3,4,5,6,7,8,9,10],
    // 审核面板
    showReviewPanel: false,
    pendingList: [],
    reviewLoading: false,
    // 我的上报
    showMySubmissions: false,
    mySubmissions: [],
    lastDeleted: null,
    showUndoBar: false,
    TIDE_DIRECTION_MAP: { rising: '涨潮', falling: '退潮' },
    TIDE_TYPE_MAP: { big: '大潮', medium: '中潮', small: '小潮' },
  },

  onLoad: function(options) {
    var id = options.id;
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'error' });
      wx.navigateBack();
      return;
    }
    this._id = id;
    this.loadCompetition(id);
  },

  onShow: function() {
    if (this._id) {
      this.checkCompetitionPermission();
    }
  },

  checkCompetitionPermission: function() {
    var that = this;
    wx.cloud.callFunction({
      name: 'updateCompetition',
      data: {
        action: 'checkPermission',
        competitionId: this._id
      }
    }).then(function(res) {
      if (res.result && res.result.success) {
        that.setData({
          canEdit: res.result.canEdit,
          canDelete: res.result.canDelete,
          canAssign: res.result.canAssign,
          isCreator: res.result.isCreator,
          isSuperAdmin: res.result.isSuperAdmin,
          isAdmin: res.result.canEdit
        });
      }
    }).catch(function(err) {
      console.error('checkCompetitionPermission error:', err);
    });
  },

  loadCompetition: function(id) {
    var that = this;
    this.setData({ loading: true });
    
    var db = app.globalData.db;
    db.collection('competitions').doc(id).get().then(function(res) {
      var competition = res.data;
      wx.setNavigationBarTitle({ title: competition.name });

      var entries = (competition.entries || []).filter(function(e) { return !e.deleted; });
      var sorted = entries.sort(function(a, b) {
        var lenA = a.length_cm || 0;
        var lenB = b.length_cm || 0;
        if (lenB !== lenA) return lenB - lenA;
        return (b.total_weight_g || 0) - (a.total_weight_g || 0);
      }).map(function(e, i) {
        return {
          id: e.id,
          player_name: e.player_name,
          best_species: e.best_species,
          length_cm: e.length_cm,
          total_weight_g: e.total_weight_g,
          spot: e.spot,
          note: e.note,
          photo_url: e.catch_photo_url || e.photo_url,
          catch_photo_url: e.catch_photo_url || e.photo_url,
          spot_photo1_url: e.spot_photo1_url,
          spot_photo2_url: e.spot_photo2_url,
          catch_date: e.catch_date,
          catch_time: e.catch_time,
          catchTimeDisplay: (function() {
            if (e.catch_date && e.catch_time) return e.catch_date + ' ' + e.catch_time;
            if (e.catch_date) return e.catch_date;
            if (e.catch_time) return e.catch_time;
            return '';
          })(),
          tide_direction: e.tide_direction,
          tide_score: e.tide_score,
          tide_type: e.tide_type,
          spot_lat: e.spot_lat,
          spot_lon: e.spot_lon,
          rank: i + 1,
          medal: i < 3 ? MEDAL[i] : String(i + 1),
          lengthDisplay: e.length_cm ? e.length_cm + ' cm' : '—',
          weightDisplay: e.total_weight_g
            ? (e.total_weight_g >= 1000 ? (e.total_weight_g / 1000).toFixed(2) + ' kg' : e.total_weight_g + ' g')
            : '待定',
          tideDisplay: (function() {
            var parts = [];
            if (e.tide_direction) parts.push(e.tide_direction === 'rising' ? '涨' : '退');
            if (e.tide_score) parts.push(e.tide_score + '分');
            if (e.tide_type) parts.push(e.tide_type === 'big' ? '大潮' : (e.tide_type === 'medium' ? '中潮' : '小潮'));
            return parts.join('·');
          })(),
          isTop3: i < 3,
        };
      });

      competition.entries = sorted;
      var statusInfo = STATUS_MAP[competition.status] || {};
      competition.statusLabel = statusInfo.label || competition.status;
      competition.statusColor = statusInfo.color || '#999';

      that.setData({
        competition: competition,
        top3: sorted.slice(0, 3),
        rest: sorted.slice(3),
        loading: false,
      });

      that.checkCompetitionPermission();
    }).catch(function(err) {
      console.error('加载比赛详情失败', err);
      wx.showToast({ title: '加载失败', icon: 'error' });
      that.setData({ loading: false });
    });
  },

  editCompetition: function() {
    wx.navigateTo({ url: '/pages/admin/competition-edit?id=' + this._id });
  },

  deleteCompetition: function() {
    var that = this;
    wx.showModal({
      title: '删除比赛',
      content: '确定删除这场比赛？所有成绩将一并删除，不可恢复。',
      confirmColor: '#e85555',
      success: function(res) {
        if (!res.confirm) return;
        app.globalData.db.collection('competitions').doc(that._id).remove().then(function() {
          wx.showToast({ title: '已删除', icon: 'success' });
          setTimeout(function() { wx.navigateBack(); }, 1000);
        }).catch(function() {
          wx.showToast({ title: '删除失败', icon: 'error' });
        });
      },
    });
  },

  openAddEntry: function() {
    this.setData({
      showEntryPanel: true,
      editingEntryId: null,
      editingPendingId: null,
      isUserSubmit: false,
      catchPhotoTemp: '',
      spotPhoto1Temp: '',
      spotPhoto2Temp: '',
      entryForm: this._emptyForm(),
    });
  },

  // 用户上报钓获（待审核）
  openSubmitEntry: function() {
    this.setData({
      showEntryPanel: true,
      editingEntryId: null,
      editingPendingId: null,
      isUserSubmit: true,
      catchPhotoTemp: '',
      spotPhoto1Temp: '',
      spotPhoto2Temp: '',
      entryForm: this._emptyForm(),
    });
  },

  _emptyForm: function() {
    return {
      player_name: '', best_species: '', length_cm: '', total_weight_g: '',
      spot: '', note: '', photo_url: '',
      catch_photo_url: '', spot_photo1_url: '', spot_photo2_url: '',
      catch_date: '', catch_time: '', tide_direction: '', tide_score: '', tide_type: '',
      spot_lat: '', spot_lon: '',
    };
  },

  openEditEntry: function(e) {
    var id = e.currentTarget.dataset.id;
    var entries = this.data.competition.entries || [];
    var entry = null;
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].id === id) { entry = entries[i]; break; }
    }
    if (!entry) return;
    this.setData({
      showEntryPanel: true,
      editingEntryId: id,
      editingPendingId: null,
      isUserSubmit: false,
      catchPhotoTemp: '',
      spotPhoto1Temp: '',
      spotPhoto2Temp: '',
      entryForm: {
        player_name: entry.player_name || '',
        best_species: entry.best_species || '',
        length_cm: entry.length_cm ? String(entry.length_cm) : '',
        total_weight_g: entry.total_weight_g ? String(entry.total_weight_g) : '',
        spot: entry.spot || '',
        note: entry.note || '',
        photo_url: entry.catch_photo_url || entry.photo_url || '',
        catch_photo_url: entry.catch_photo_url || entry.photo_url || '',
        spot_photo1_url: entry.spot_photo1_url || '',
        spot_photo2_url: entry.spot_photo2_url || '',
        catch_date: entry.catch_date || '',
        catch_time: entry.catch_time || '',
        tide_direction: entry.tide_direction || '',
        tide_score: entry.tide_score ? String(entry.tide_score) : '',
        tide_type: entry.tide_type || '',
        spot_lat: entry.spot_lat ? String(entry.spot_lat) : '',
        spot_lon: entry.spot_lon ? String(entry.spot_lon) : '',
      },
    });
  },

  // 用户编辑被拒绝的上报记录重新提交
  openEditSubmission: function(e) {
    var id = e.currentTarget.dataset.id;
    var item = null;
    for (var i = 0; i < this.data.mySubmissions.length; i++) {
      if (this.data.mySubmissions[i]._id === id) { item = this.data.mySubmissions[i]; break; }
    }
    if (!item || !item.entry) return;
    var entry = item.entry;
    this.setData({
      showEntryPanel: true,
      editingEntryId: null,
      editingPendingId: id,
      isUserSubmit: true,
      catchPhotoTemp: '',
      spotPhoto1Temp: '',
      spotPhoto2Temp: '',
      showMySubmissions: false,
      entryForm: {
        player_name: entry.player_name || '',
        best_species: entry.best_species || '',
        length_cm: entry.length_cm ? String(entry.length_cm) : '',
        total_weight_g: entry.total_weight_g ? String(entry.total_weight_g) : '',
        spot: entry.spot || '',
        note: entry.note || '',
        photo_url: entry.catch_photo_url || entry.photo_url || '',
        catch_photo_url: entry.catch_photo_url || entry.photo_url || '',
        spot_photo1_url: entry.spot_photo1_url || '',
        spot_photo2_url: entry.spot_photo2_url || '',
        catch_date: entry.catch_date || '',
        catch_time: entry.catch_time || '',
        tide_direction: entry.tide_direction || '',
        tide_score: entry.tide_score ? String(entry.tide_score) : '',
        tide_type: entry.tide_type || '',
        spot_lat: entry.spot_lat ? String(entry.spot_lat) : '',
        spot_lon: entry.spot_lon ? String(entry.spot_lon) : '',
      },
    });
  },

  closeEntryPanel: function() {
    this.setData({ showEntryPanel: false });
  },

  stopPropagation: function() {},

  // 选择图片：type = 'catch' | 'spot1' | 'spot2'
  choosePhoto: function(e) {
    var that = this;
    var type = e.currentTarget.dataset.type;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: function(res) {
        var file = res.tempFiles[0];
        var tempPath = file.tempFilePath;
        var fileSize = file.size;

        if (fileSize > 1024 * 1024) {
          wx.showLoading({ title: '压缩图片中…' });
          that.compressImage(tempPath, fileSize).then(function(compressed) {
            wx.hideLoading();
            that._setPhoto(type, compressed);
          }).catch(function(err) {
            wx.hideLoading();
            console.error('压缩失败:', err);
            wx.showToast({ title: '图片过大，压缩失败', icon: 'none' });
          });
        } else {
          that._setPhoto(type, tempPath);
        }
      },
    });
  },

  _setPhoto: function(type, path) {
    var obj = {};
    if (type === 'catch') {
      obj['catchPhotoTemp'] = path;
      obj['entryForm.catch_photo_url'] = path;
    } else if (type === 'spot1') {
      obj['spotPhoto1Temp'] = path;
      obj['entryForm.spot_photo1_url'] = path;
    } else if (type === 'spot2') {
      obj['spotPhoto2Temp'] = path;
      obj['entryForm.spot_photo2_url'] = path;
    }
    this.setData(obj);
  },

  removePhoto: function(e) {
    var type = e.currentTarget.dataset.type;
    var obj = {};
    if (type === 'catch') {
      obj['catchPhotoTemp'] = '';
      obj['entryForm.catch_photo_url'] = '';
    } else if (type === 'spot1') {
      obj['spotPhoto1Temp'] = '';
      obj['entryForm.spot_photo1_url'] = '';
    } else if (type === 'spot2') {
      obj['spotPhoto2Temp'] = '';
      obj['entryForm.spot_photo2_url'] = '';
    }
    this.setData(obj);
  },

  compressImage: function(filePath, originalSize) {
    return new Promise(function(resolve, reject) {
      var targetSize = 900 * 1024;
      var quality = Math.floor((targetSize / originalSize) * 100);
      quality = Math.max(20, Math.min(80, quality));

      wx.compressImage({
        src: filePath,
        quality: quality,
        success: function(res) {
          wx.getFileInfo({
            filePath: res.tempFilePath,
            success: function(info) {
              if (info.size > 1024 * 1024) {
                wx.compressImage({
                  src: res.tempFilePath,
                  quality: 20,
                  success: function(res2) { resolve(res2.tempFilePath); },
                  fail: reject,
                });
              } else {
                resolve(res.tempFilePath);
              }
            },
            fail: function() { resolve(res.tempFilePath); },
          });
        },
        fail: reject,
      });
    });
  },

  removePhoto: function(e) {
    var type = e.currentTarget.dataset.type;
    var obj = {};
    if (type === 'catch') {
      obj['catchPhotoTemp'] = '';
      obj['entryForm.catch_photo_url'] = '';
    } else if (type === 'spot1') {
      obj['spotPhoto1Temp'] = '';
      obj['entryForm.spot_photo1_url'] = '';
    } else if (type === 'spot2') {
      obj['spotPhoto2Temp'] = '';
      obj['entryForm.spot_photo2_url'] = '';
    }
    this.setData(obj);
  },

  // 上传单张图片到云存储
  _uploadOne: function(tempPath) {
    return new Promise(function(resolve) {
      if (!tempPath || tempPath.indexOf('cloud://') === 0) {
        resolve(tempPath || '');
        return;
      }
      var ext = tempPath.split('.').pop() || 'jpg';
      var cloudPath = 'leaderboard_photos/' + Date.now() + '_' + Math.random().toString(36).slice(2) + '.' + ext;
      wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: tempPath,
      }).then(function(res) { resolve(res.fileID); }).catch(function() { resolve(''); });
    });
  },

  // 上传所有图片，返回 {catch_photo_url, spot_photo1_url, spot_photo2_url}
  uploadAllPhotos: function() {
    var that = this;
    return Promise.all([
      this._uploadOne(this.data.catchPhotoTemp || this.data.entryForm.catch_photo_url),
      this._uploadOne(this.data.spotPhoto1Temp || this.data.entryForm.spot_photo1_url),
      this._uploadOne(this.data.spotPhoto2Temp || this.data.entryForm.spot_photo2_url),
    ]).then(function(urls) {
      return {
        catch_photo_url: urls[0] || null,
        spot_photo1_url: urls[1] || null,
        spot_photo2_url: urls[2] || null,
      };
    });
  },

  // 钓点地图定位
  chooseLocation: function() {
    var that = this;
    wx.chooseLocation({
      success: function(res) {
        that.setData({
          'entryForm.spot': res.name || res.address || '',
          'entryForm.spot_lat': String(res.latitude),
          'entryForm.spot_lon': String(res.longitude),
        });
      },
      fail: function(err) {
        if (err.errMsg && err.errMsg.indexOf('cancel') === -1) {
          wx.showToast({ title: '请授权位置权限', icon: 'none' });
        }
      }
    });
  },

  onTideDirectionChange: function(e) {
    var idx = Number(e.detail.value);
    var val = this.data.tideDirectionOptions[idx] ? this.data.tideDirectionOptions[idx].value : '';
    this.setData({ 'entryForm.tide_direction': val });
  },
  onTideTypeChange: function(e) {
    var idx = Number(e.detail.value);
    var val = this.data.tideTypeOptions[idx] ? this.data.tideTypeOptions[idx].value : '';
    this.setData({ 'entryForm.tide_type': val });
  },
  onTideScoreChange: function(e) {
    var idx = Number(e.detail.value);
    var val = this.data.tideScoreOptions[idx] ? this.data.tideScoreOptions[idx] : '';
    this.setData({ 'entryForm.tide_score': String(val) });
  },
  onCatchDateChange: function(e) {
    this.setData({ 'entryForm.catch_date': e.detail.value });
  },
  onCatchTimeChange: function(e) {
    this.setData({ 'entryForm.catch_time': e.detail.value });
  },

  previewImage: function(e) {
    var url = e.currentTarget.dataset.url;
    if (url) wx.previewImage({ urls: [url], current: url });
  },

  onEntryInput: function(e) {
    var field = e.currentTarget.dataset.field;
    var obj = {};
    obj['entryForm.' + field] = e.detail.value;
    this.setData(obj);
  },

  // 文本内容安全检测（昵称/鱼种/钓点/备注等）
  _checkTextSafe: function(content) {
    return new Promise(function(resolve) {
      if (!content || !content.trim()) { resolve(true); return; }
      wx.cloud.callFunction({
        name: 'checkText',
        data: { content: content },
      }).then(function(res) {
        resolve(res.result && res.result.safe !== false);
      }).catch(function() { resolve(true); }); // 检测服务异常时放行
    });
  },

  // 单张图片安全检测（仅检测云存储图片）
  _checkImageSafe: function(fileID) {
    return new Promise(function(resolve) {
      if (!fileID || fileID.indexOf('cloud://') !== 0) { resolve(true); return; }
      wx.cloud.callFunction({
        name: 'checkImage',
        data: { fileID: fileID },
      }).then(function(res) {
        resolve(res.result && res.result.safe !== false);
      }).catch(function() { resolve(true); });
    });
  },

  // 检测所有上传图片，全部合规返回 true
  _checkAllImages: function(photos) {
    var that = this;
    var urls = [photos.catch_photo_url, photos.spot_photo1_url, photos.spot_photo2_url];
    return Promise.all(urls.map(function(u) { return that._checkImageSafe(u); }))
      .then(function(results) {
        return results.every(function(r) { return r === true; });
      });
  },

  saveEntry: function() {
    if (this.data.saving) return;
    var that = this;
    var entryForm = this.data.entryForm;
    var editingEntryId = this.data.editingEntryId;
    var editingPendingId = this.data.editingPendingId;
    var isUserSubmit = this.data.isUserSubmit;

    if (!entryForm.player_name.trim()) {
      wx.showToast({ title: '请输入钓友昵称', icon: 'none' });
      return;
    }
    // 渔获尺寸图必填
    if (!entryForm.catch_photo_url && !entryForm.photo_url) {
      wx.showToast({ title: '请上传渔获尺寸图', icon: 'none' });
      return;
    }

    this.setData({ saving: true });
    wx.showLoading({ title: '内容安全检测…' });

    // 1. 文字内容安全检测
    var textToCheck = [entryForm.player_name, entryForm.best_species, entryForm.spot, entryForm.note].join(' ');
    this._checkTextSafe(textToCheck).then(function(textSafe) {
      if (!textSafe) {
        wx.hideLoading();
        that.setData({ saving: false });
        wx.showToast({ title: '文字含违规信息，请修改', icon: 'none' });
        return Promise.reject({ handled: true });
      }
      // 2. 上传图片到云存储
      wx.showLoading({ title: '上传图片…' });
      return that.uploadAllPhotos();
    }).then(function(photos) {
      // 3. 图片内容安全检测
      return that._checkAllImages(photos).then(function(imgSafe) {
        if (!imgSafe) {
          wx.hideLoading();
          that.setData({ saving: false });
          wx.showToast({ title: '图片含违规内容，请更换', icon: 'none' });
          return Promise.reject({ handled: true });
        }
        return photos;
      });
    }).then(function(photos) {
      wx.showLoading({ title: '保存中…' });
      var entry = {
        player_name: entryForm.player_name.trim(),
        best_species: entryForm.best_species.trim(),
        length_cm: entryForm.length_cm ? Number(entryForm.length_cm) : null,
        total_weight_g: entryForm.total_weight_g ? Number(entryForm.total_weight_g) : null,
        spot: entryForm.spot.trim(),
        note: entryForm.note.trim(),
        catch_photo_url: photos.catch_photo_url,
        spot_photo1_url: photos.spot_photo1_url,
        spot_photo2_url: photos.spot_photo2_url,
        catch_date: entryForm.catch_date || null,
        catch_time: entryForm.catch_time || null,
        tide_direction: entryForm.tide_direction || null,
        tide_score: entryForm.tide_score ? Number(entryForm.tide_score) : null,
        tide_type: entryForm.tide_type || null,
        spot_lat: entryForm.spot_lat ? Number(entryForm.spot_lat) : null,
        spot_lon: entryForm.spot_lon ? Number(entryForm.spot_lon) : null,
      };

      if (isUserSubmit) {
        return wx.cloud.callFunction({
          name: 'submissionService',
          data: {
            action: 'submitEntry',
            competitionId: that._id,
            entry: entry,
            pendingId: editingPendingId || null,
          },
        });
      }

      return wx.cloud.callFunction({
        name: 'updateCompetition',
        data: {
          action: editingEntryId ? 'updateEntry' : 'addEntry',
          competitionId: that._id,
          entry: entry,
          entryId: editingEntryId,
        },
      });
    }).then(function(res) {
      wx.hideLoading();
      that.setData({ saving: false });
      if (res.result.success) {
        wx.showToast({ title: res.result.message || '保存成功', icon: 'success' });
        that.setData({
          showEntryPanel: false,
          catchPhotoTemp: '',
          spotPhoto1Temp: '',
          spotPhoto2Temp: '',
        });
        if (!isUserSubmit) {
          that.loadCompetition(that._id);
        } else if (that.data.showMySubmissions) {
          that.loadMySubmissions();
        }
      } else {
        wx.showToast({ title: res.result.error || '保存失败', icon: 'none' });
      }
    }).catch(function(err) {
      wx.hideLoading();
      that.setData({ saving: false });
      if (err && err.handled) return; // 检测不通过已提示
      console.error('保存失败', err);
      wx.showToast({ title: '保存失败，请重试', icon: 'error' });
    });
  },

  // ===== 查看详情面板（所有用户）=====
  openEntryDetail: function(e) {
    var id = e.currentTarget.dataset.id;
    var entries = this.data.competition.entries || [];
    var entry = null;
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].id === id) { entry = entries[i]; break; }
    }
    if (!entry) return;

    // 构造地图标记与中心点
    var markers = [];
    var hasLocation = !!(entry.spot_lat && entry.spot_lon);
    var mapLat, mapLon, mapScale;
    if (hasLocation) {
      mapLat = Number(entry.spot_lat);
      mapLon = Number(entry.spot_lon);
      mapScale = 15;
      markers.push({
        id: 1,
        latitude: mapLat,
        longitude: mapLon,
        title: entry.spot || '钓点',
        width: 30,
        height: 30,
        callout: {
          content: '📍 ' + (entry.spot || '钓点'),
          color: '#1a7f5a',
          fontSize: 13,
          bgColor: '#ffffff',
          padding: 6,
          borderRadius: 6,
          display: 'ALWAYS',
        },
      });
    } else {
      // 无定位：默认中国中心，小比例尺便于浏览全国/世界
      mapLat = 35.0;
      mapLon = 105.0;
      mapScale = 4;
    }

    this.setData({
      showDetailPanel: true,
      detailEntry: Object.assign({}, entry, {
        mapMarkers: markers,
        hasLocation: hasLocation,
        mapLat: mapLat,
        mapLon: mapLon,
        mapScale: mapScale,
      }),
    });
  },

  closeDetailPanel: function() {
    this.setData({ showDetailPanel: false, detailEntry: null });
  },

  // 点击地图，打开微信内置地图查看钓点位置
  openSpotLocation: function() {
    var entry = this.data.detailEntry;
    if (!entry || !entry.hasLocation) return;
    wx.openLocation({
      latitude: Number(entry.spot_lat),
      longitude: Number(entry.spot_lon),
      name: entry.spot || '钓点',
      address: entry.spot || '',
      scale: 16,
    });
  },

  // 从详情面板进入编辑（管理员）
  editFromDetail: function() {
    var entry = this.data.detailEntry;
    if (!entry) return;
    this.setData({ showDetailPanel: false });
    this.openEditEntry({ currentTarget: { dataset: { id: entry.id } } });
  },

  // 从详情面板删除（管理员）
  deleteFromDetail: function() {
    var entry = this.data.detailEntry;
    if (!entry) return;
    this.setData({ showDetailPanel: false });
    this.deleteEntry({ currentTarget: { dataset: { id: entry.id } } });
  },

  deleteEntry: function(e) {
    var that = this;
    var id = e.currentTarget.dataset.id;
    var entries = this.data.competition.entries || [];
    var entry = null;
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].id === id) {
        entry = entries[i];
        break;
      }
    }
    
    var playerName = entry ? entry.player_name : '';
    wx.showModal({
      title: '删除记录',
      content: '确定删除 ' + playerName + ' 的记录吗？',
      confirmColor: '#e85555',
      success: function(res) {
        if (!res.confirm) return;
        wx.cloud.callFunction({
          name: 'updateCompetition',
          data: {
            action: 'deleteEntry',
            competitionId: that._id,
            entryId: id,
          },
        }).then(function(result) {
          if (result.result.success) {
            that.setData({
              lastDeleted: Object.assign({}, entry, { competitionId: that._id }),
              showUndoBar: true,
            });
            clearTimeout(that._undoTimer);
            that._undoTimer = setTimeout(function() {
              that.setData({ showUndoBar: false, lastDeleted: null });
            }, 5000);
            that.loadCompetition(that._id);
          } else {
            wx.showToast({ title: result.result.error || '删除失败', icon: 'error' });
          }
        }).catch(function() {
          wx.showToast({ title: '删除失败', icon: 'error' });
        });
      },
    });
  },

  // ===== 管理员审核面板 =====
  openReviewPanel: function() {
    this.setData({ showReviewPanel: true, pendingList: [] });
    this.loadPendingEntries();
  },
  closeReviewPanel: function() { this.setData({ showReviewPanel: false }); },

  loadPendingEntries: function() {
    var that = this;
    this.setData({ reviewLoading: true });
    wx.cloud.callFunction({
      name: 'submissionService',
      data: { action: 'getPendingEntries', competitionId: this._id },
    }).then(function(res) {
      that.setData({ reviewLoading: false });
      if (res.result.success) {
        var list = (res.result.list || []).map(function(item) {
          var e = item.entry || {};
          return {
            _id: item._id, status: item.status, rejection_reason: item.rejection_reason,
            player_name: e.player_name, best_species: e.best_species,
            length_cm: e.length_cm, total_weight_g: e.total_weight_g,
            spot: e.spot, note: e.note,
            catch_photo_url: e.catch_photo_url || e.photo_url,
            spot_photo1_url: e.spot_photo1_url, spot_photo2_url: e.spot_photo2_url,
            catch_time: e.catch_time, tide_direction: e.tide_direction,
            tide_score: e.tide_score, tide_type: e.tide_type,
            spot_lat: e.spot_lat, spot_lon: e.spot_lon,
            submitted_at: item.submitted_at,
          };
        });
        that.setData({ pendingList: list });
      }
    }).catch(function() { that.setData({ reviewLoading: false }); });
  },

  approveEntry: function(e) {
    var that = this;
    var id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '审核通过', content: '确认通过该上报记录并加入榜单？',
      success: function(res) {
        if (!res.confirm) return;
        wx.showLoading({ title: '审核中…' });
        wx.cloud.callFunction({
          name: 'submissionService',
          data: { action: 'reviewEntry', competitionId: that._id, pendingId: id, approved: true },
        }).then(function(r) {
          wx.hideLoading();
          if (r.result.success) {
            wx.showToast({ title: '已通过', icon: 'success' });
            that.loadPendingEntries();
            that.loadCompetition(that._id);
          } else {
            wx.showToast({ title: r.result.error || '操作失败', icon: 'none' });
          }
        }).catch(function() { wx.hideLoading(); wx.showToast({ title: '操作失败', icon: 'error' }); });
      }
    });
  },

  rejectEntry: function(e) {
    var that = this;
    var id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '拒绝上报', editable: true, placeholderText: '请输入拒绝原因（可选）',
      success: function(res) {
        if (!res.confirm) return;
        wx.showLoading({ title: '处理中…' });
        wx.cloud.callFunction({
          name: 'submissionService',
          data: { action: 'reviewEntry', competitionId: that._id, pendingId: id, approved: false, reason: res.content || '不符合要求' },
        }).then(function(r) {
          wx.hideLoading();
          if (r.result.success) { wx.showToast({ title: '已拒绝', icon: 'success' }); that.loadPendingEntries(); }
          else { wx.showToast({ title: r.result.error || '操作失败', icon: 'none' }); }
        }).catch(function() { wx.hideLoading(); wx.showToast({ title: '操作失败', icon: 'error' }); });
      }
    });
  },

  // ===== 我的上报 =====
  openMySubmissions: function() {
    this.setData({ showMySubmissions: true, mySubmissions: [] });
    this.loadMySubmissions();
  },
  closeMySubmissions: function() { this.setData({ showMySubmissions: false }); },

  loadMySubmissions: function() {
    var that = this;
    wx.cloud.callFunction({ name: 'submissionService', data: { action: 'getMySubmissions' } }).then(function(res) {
      if (res.result.success) {
        var list = (res.result.list || []).map(function(item) {
          var e = item.entry || {};
          return {
            _id: item._id, competition_id: item.competition_id,
            status: item.status,
            statusText: item.status === 'pending' ? '审核中' : '已拒绝',
            statusColor: item.status === 'pending' ? '#f5a623' : '#e85555',
            rejection_reason: item.rejection_reason,
            player_name: e.player_name, best_species: e.best_species,
            length_cm: e.length_cm, spot: e.spot,
            catch_photo_url: e.catch_photo_url || e.photo_url,
            submitted_at: item.submitted_at,
          };
        });
        that.setData({ mySubmissions: list });
      }
    }).catch(function() {});
  },

  deleteMySubmission: function(e) {
    var that = this;
    var id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除上报', content: '确定删除这条上报记录？', confirmColor: '#e85555',
      success: function(res) {
        if (!res.confirm) return;
        wx.cloud.callFunction({ name: 'submissionService', data: { action: 'deleteSubmission', pendingId: id } }).then(function(r) {
          if (r.result.success) { wx.showToast({ title: '已删除', icon: 'success' }); that.loadMySubmissions(); }
        });
      }
    });
  },

  manageAdmins: function() {
    if (!this.data.canAssign) {
      wx.showToast({ title: '无权限管理', icon: 'none' });
      return;
    }

    var that = this;
    wx.showLoading({ title: '加载中…' });
    wx.cloud.callFunction({
      name: 'updateCompetition',
      data: {
        action: 'getAdmins',
        competitionId: this._id
      }
    }).then(function(res) {
      wx.hideLoading();
      if (res.result && res.result.success) {
        var admins = res.result.admins || [];
        var creatorNote = res.result.creatorNote || '创建者';
        
        var content = '创建者：' + creatorNote + '\n';
        if (admins.length > 0) {
          content += '\n已授权管理员：\n';
          for (var i = 0; i < admins.length; i++) {
            content += (i + 1) + '. ' + admins[i].note + '\n';
          }
        } else {
          content += '\n暂无其他管理员';
        }

        wx.showModal({
          title: '赛事权限管理',
          content: content,
          confirmText: '添加管理员',
          cancelText: '关闭',
          success: function(modalRes) {
            if (modalRes.confirm) {
              that.addCompetitionAdmin();
            }
          }
        });
      } else {
        var errMsg = (res.result && res.result.error) ? res.result.error : '加载失败';
        wx.showToast({ title: errMsg, icon: 'none' });
      }
    }).catch(function(err) {
      wx.hideLoading();
      console.error('manageAdmins error:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    });
  },

  addCompetitionAdmin: function() {
    var that = this;
    wx.showModal({
      title: '添加管理员',
      editable: true,
      placeholderText: '请输入用户的 OpenID',
      success: function(res) {
        if (!res.confirm || !res.content) return;
        
        var targetOpenid = res.content.trim();
        if (!targetOpenid) {
          wx.showToast({ title: '请输入有效的 OpenID', icon: 'none' });
          return;
        }

        wx.showLoading({ title: '授权中…' });
        wx.cloud.callFunction({
          name: 'updateCompetition',
          data: {
            action: 'assignAdmin',
            competitionId: that._id,
            targetOpenid: targetOpenid
          }
        }).then(function(result) {
          wx.hideLoading();
          if (result.result && result.result.success) {
            wx.showToast({ title: '授权成功', icon: 'success' });
          } else {
            var errMsg = (result.result && result.result.error) ? result.result.error : '授权失败';
            wx.showToast({ title: errMsg, icon: 'none' });
          }
        }).catch(function() {
          wx.hideLoading();
          wx.showToast({ title: '授权失败', icon: 'none' });
        });
      }
    });
  },

  undoDelete: function() {
    var that = this;
    var lastDeleted = this.data.lastDeleted;
    if (!lastDeleted) return;

    wx.showLoading({ title: '恢复中…' });
    // 软删除恢复：调用 restoreEntry 取消 deleted 标记
    wx.cloud.callFunction({
      name: 'updateCompetition',
      data: {
        action: 'restoreEntry',
        competitionId: lastDeleted.competitionId,
        entryId: lastDeleted.id,
      },
    }).then(function(res) {
      wx.hideLoading();
      if (res.result.success) {
        wx.showToast({ title: '已恢复', icon: 'success' });
        that.setData({ showUndoBar: false, lastDeleted: null });
        clearTimeout(that._undoTimer);
        that.loadCompetition(that._id);
      } else {
        wx.showToast({ title: res.result.error || '恢复失败', icon: 'error' });
      }
    }).catch(function() {
      wx.hideLoading();
      wx.showToast({ title: '恢复失败', icon: 'error' });
    });
  },

  dismissUndoBar: function() {
    this.setData({ showUndoBar: false, lastDeleted: null });
    clearTimeout(this._undoTimer);
  },

  exportImage: function() {
    var that = this;
    var competition = this.data.competition;
    if (!competition) return;

    wx.showLoading({ title: '生成图片…', mask: true });

    var entries = (competition.entries || []).slice(0, 30);
    var entryCount = entries.length;
    var W = 750;
    var headerH = 160;
    var rowH = 60;
    var footerH = 80;
    var H = headerH + entryCount * rowH + footerH;

    wx.createSelectorQuery()
      .select('#exportCanvas')
      .fields({ node: true, size: true })
      .exec(function(res) {
        if (!res[0] || !res[0].node) {
          wx.hideLoading();
          wx.showToast({ title: '生成失败', icon: 'error' });
          return;
        }

        var canvas = res[0].node;
        var ctx = canvas.getContext('2d');
        var dpr = wx.getSystemInfoSync().pixelRatio;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.scale(dpr, dpr);

        ctx.fillStyle = '#f4f6f4';
        ctx.fillRect(0, 0, W, H);

        var grad = ctx.createLinearGradient(0, 0, W, headerH);
        grad.addColorStop(0, '#1a7f5a');
        grad.addColorStop(1, '#0d5c42');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, headerH);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(competition.name, W / 2, 60);

        ctx.font = '24px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        var subtitle = (competition.date || '') + ' · ' + (competition.location || '');
        ctx.fillText(subtitle, W / 2, 100);

        ctx.font = '20px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText('排名规则：长度优先，长度相同按重量', W / 2, 135);

        ctx.textAlign = 'left';
        var startY = headerH + 20;

        for (var i = 0; i < entries.length; i++) {
          var entry = entries[i];
          var y = startY + i * rowH;

          ctx.fillStyle = (i % 2 === 0) ? '#ffffff' : '#f9f9f9';
          ctx.fillRect(20, y, W - 40, rowH - 4);

          if (i < 3) {
            ctx.fillStyle = (i === 0) ? '#fff8e6' : ((i === 1) ? '#f5f5f5' : '#fff5ee');
            ctx.fillRect(20, y, W - 40, rowH - 4);
          }

          ctx.fillStyle = (i < 3) ? '#d4a000' : '#666666';
          ctx.font = (i < 3) ? 'bold 28px sans-serif' : '26px sans-serif';
          var medal = (i === 0) ? '🥇' : ((i === 1) ? '🥈' : ((i === 2) ? '🥉' : String(i + 1)));
          ctx.fillText(medal, 40, y + 38);

          ctx.fillStyle = '#1a1a1a';
          ctx.font = (i < 3) ? 'bold 26px sans-serif' : '26px sans-serif';
          ctx.fillText(entry.player_name || '—', 100, y + 38);

          ctx.fillStyle = '#999999';
          ctx.font = '20px sans-serif';
          var metaArr = [];
          if (entry.best_species) metaArr.push(entry.best_species);
          if (entry.spot) metaArr.push(entry.spot);
          ctx.fillText(metaArr.join(' · '), 280, y + 38);

          ctx.textAlign = 'right';
          ctx.fillStyle = '#1a7f5a';
          ctx.font = 'bold 26px sans-serif';
          var lengthStr = entry.length_cm ? (entry.length_cm + ' cm') : '—';
          ctx.fillText(lengthStr, W - 140, y + 32);

          ctx.fillStyle = '#999999';
          ctx.font = '20px sans-serif';
          var weightStr = entry.total_weight_g 
            ? (entry.total_weight_g >= 1000 ? ((entry.total_weight_g / 1000).toFixed(1) + 'kg') : (entry.total_weight_g + 'g'))
            : '待定';
          ctx.fillText(weightStr, W - 40, y + 32);

          ctx.textAlign = 'left';
        }

        ctx.textAlign = 'center';
        ctx.fillStyle = '#999999';
        ctx.font = '22px sans-serif';
        ctx.fillText('钓鱼赛事助手', W / 2, H - 30);

        wx.canvasToTempFilePath({
          canvas: canvas,
          fileType: 'png',
          quality: 1,
          success: function(r) {
            wx.hideLoading();
            var tempPath = r.tempFilePath;
            wx.showActionSheet({
              itemList: ['保存到相册', '分享给好友'],
              success: function(actionRes) {
                if (actionRes.tapIndex === 0) {
                  wx.saveImageToPhotosAlbum({
                    filePath: tempPath,
                    success: function() { wx.showToast({ title: '已保存到相册', icon: 'success' }); },
                    fail: function() { wx.showToast({ title: '请授权相册权限', icon: 'none' }); },
                  });
                } else if (actionRes.tapIndex === 1) {
                  wx.shareFileMessage({
                    filePath: tempPath,
                    fileName: competition.name + '_榜单.png',
                    fail: function() { wx.previewImage({ urls: [tempPath] }); },
                  });
                }
              },
            });
          },
          fail: function() {
            wx.hideLoading();
            wx.showToast({ title: '生成失败', icon: 'error' });
          },
        });
      });
  },

  onShareAppMessage: function() {
    var competition = this.data.competition;
    if (!competition) {
      return {
        title: '钓鱼赛事榜单',
        path: '/pages/competition/competition-detail?id=' + this._id,
      };
    }

    var entries = competition.entries || [];
    var top1 = entries[0];
    var entryCount = entries.length;

    var title = competition.name;
    if (top1 && top1.player_name) {
      title = '🏆 ' + competition.name;
    }

    return {
      title: title,
      path: '/pages/competition/competition-detail?id=' + this._id,
    };
  },

  onShareTimeline: function() {
    var competition = this.data.competition;
    if (!competition) {
      return {
        title: '钓鱼赛事榜单 - 快来看看谁是钓鱼王',
        query: 'id=' + this._id,
      };
    }

    var entries = competition.entries || [];
    var top1 = entries[0];

    var title = '🏆 ' + competition.name;
    if (top1 && top1.player_name) {
      title += ' | 冠军：' + top1.player_name;
      if (top1.length_cm) {
        title += ' ' + top1.length_cm + 'cm';
      }
    }

    return {
      title: title,
      query: 'id=' + this._id,
    };
  },
});
