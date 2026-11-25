import { call, toastError } from '../../utils/api';
import { dateTime, money } from '../../utils/format';
import { nav } from '../../utils/ui';

const TABS = ['全部', '待回收', '待处置', '维修中', '已维修', '已拆解', '已取消'];
const TAG_CLASS = {
    待回收: 'tag-warn',
    待处置: 'tag-warn',
    维修中: 'tag-warn',
    已维修: 'tag-primary',
    已拆解: 'tag-primary',
    已取消: 'tag',
};

Page({
    data: {
        loading: true,
        list: [],
        tabs: TABS,
        activeTab: '全部',
    },
    onShow() {
        this.load();
    },
    onPullDownRefresh() {
        this.load().then(() => wx.stopPullDownRefresh());
    },
    async load() {
        this.setData({ loading: true });
        try {
            const status = this.data.activeTab === '全部' ? '' : this.data.activeTab;
            const res = await call('tradeIn.list', { status });
            const list = (res.list || []).map((row) => ({
                ...row,
                date_text: dateTime(row.created_at),
                credit_text: money(row.credit_amount),
                rod_text: [row.old_brand, row.old_model, row.old_spec].filter(Boolean).join(' ') || '未登记型号',
                tag_class: TAG_CLASS[row.status] || 'tag',
            }));
            this.setData({ list });
        }
        catch (err) {
            toastError(err);
        }
        finally {
            this.setData({ loading: false });
        }
    },
    onTab(e) {
        const tab = e.currentTarget.dataset.tab;
        if (tab === this.data.activeTab)
            return;
        this.setData({ activeTab: tab });
        this.load();
    },
    onDetail(e) {
        nav('/pages/tradeins/edit?id=' + e.currentTarget.dataset.id);
    },
});
