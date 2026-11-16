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
    saving: false,
    entryForm: {
      player_name: '',
      best_species: '',
      length_cm: '',
      total_weight_g: '',
      spot: '',
      note: '',
      photo_url: '',
    },
    photoTempPath: '',
    lastDeleted: null,
    showUndoBar: false,
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

      var entries = competition.entries || [];
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
          photo_url: e.photo_url,
          rank: i + 1,
          medal: i < 3 ? MEDAL[i] : String(i + 1),
          lengthDisplay: e.length_cm ? e.length_cm + ' cm' : '—',
          weightDisplay: e.total_weight_g 
            ? (e.total_weight_g >= 1000 ? (e.total_weight_g / 1000).toFixed(2) + ' kg' : e.total_weight_g + ' g')
            : '待定',
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
      photoTempPath: '',
      entryForm: { player_name: '', best_species: '', length_cm: '', total_weight_g: '', spot: '', note: '', photo_url: '' },
    });
  },

  openEditEntry: function(e) {
    var id = e.currentTarget.dataset.id;
    var entries = this.data.competition.entries || [];
    var entry = null;
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].id === id) {
        entry = entries[i];
        break;
      }
    }
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

  closeEntryPanel: function() {
    this.setData({ showEntryPanel: false });
  },

  stopPropagation: function() {},

  choosePhoto: function() {
    var that = this;
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
            that.setData({
              photoTempPath: compressed,
              'entryForm.photo_url': compressed,
            });
          }).catch(function(err) {
            wx.hideLoading();
            console.error('压缩失败:', err);
            wx.showToast({ title: '图片过大，压缩失败', icon: 'none' });
          });
        } else {
          that.setData({
            photoTempPath: tempPath,
            'entryForm.photo_url': tempPath,
          });
        }
      },
    });
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

  removePhoto: function() {
    this.setData({
      photoTempPath: '',
      'entryForm.photo_url': '',
    });
  },

  uploadPhoto: function() {
    var that = this;
    return new Promise(function(resolve) {
      if (!that.data.photoTempPath) {
        resolve(that.data.entryForm.photo_url || '');
        return;
      }
      var ext = that.data.photoTempPath.split('.').pop() || 'jpg';
      var cloudPath = 'leaderboard_photos/' + Date.now() + '_' + Math.random().toString(36).slice(2) + '.' + ext;
      wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: that.data.photoTempPath,
      }).then(function(res) {
        resolve(res.fileID);
      }).catch(function() {
        resolve('');
      });
    });
  },

  onEntryInput: function(e) {
    var field = e.currentTarget.dataset.field;
    var obj = {};
    obj['entryForm.' + field] = e.detail.value;
    this.setData(obj);
  },

  saveEntry: function() {
    if (this.data.saving) return;
    var that = this;
    var entryForm = this.data.entryForm;
    var editingEntryId = this.data.editingEntryId;

    if (!entryForm.player_name.trim()) {
      wx.showToast({ title: '请输入钓友昵称', icon: 'none' });
      return;
    }

    this.setData({ saving: true });
    wx.showLoading({ title: '保存中…' });

    this.uploadPhoto().then(function(photoUrl) {
      var entry = {
        player_name: entryForm.player_name.trim(),
        best_species: entryForm.best_species.trim(),
        length_cm: entryForm.length_cm ? Number(entryForm.length_cm) : null,
        total_weight_g: entryForm.total_weight_g ? Number(entryForm.total_weight_g) : null,
        spot: entryForm.spot.trim(),
        note: entryForm.note.trim(),
        photo_url: photoUrl || null,
      };

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
        wx.showToast({ title: '保存成功', icon: 'success' });
        that.setData({ showEntryPanel: false, photoTempPath: '' });
        that.loadCompetition(that._id);
      } else {
        wx.showToast({ title: res.result.error || '保存失败', icon: 'none' });
      }
    }).catch(function(err) {
      wx.hideLoading();
      that.setData({ saving: false });
      console.error('保存失败', err);
      wx.showToast({ title: '保存失败，请重试', icon: 'error' });
    });
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
    var entry = {
      player_name: lastDeleted.player_name,
      best_species: lastDeleted.best_species,
      length_cm: lastDeleted.length_cm,
      total_weight_g: lastDeleted.total_weight_g,
      spot: lastDeleted.spot,
      note: lastDeleted.note,
      photo_url: lastDeleted.photo_url,
    };

    wx.cloud.callFunction({
      name: 'updateCompetition',
      data: {
        action: 'addEntry',
        competitionId: lastDeleted.competitionId,
        entry: entry,
      },
    }).then(function(res) {
      wx.hideLoading();
      if (res.result.success) {
        wx.showToast({ title: '已恢复', icon: 'success' });
        that.setData({ showUndoBar: false, lastDeleted: null });
        clearTimeout(that._undoTimer);
        that.loadCompetition(that._id);
      } else {
        wx.showToast({ title: '恢复失败', icon: 'error' });
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
