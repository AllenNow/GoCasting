import { call, toastError } from '../../utils/api';
import { dateTime, money } from '../../utils/format';
import { nav, switchTab } from '../../utils/ui';

const TABS = ['全部', '待处理', '已完成', '已拒绝'];
const TAG_CLASS = {
    待处理: 'tag-warn',
    已完成: 'tag-primary',
    已拒绝: 'tag',
};

Page({
    data: {
        loading: true,
        list: [],
        tabs: TABS,
        activeTab: '全部',
        pendingCount: 0,
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
            const res = await call('afterSale.list', { status, limit: 50 });
            const list = (res.list || []).map((row) => ({
                ...row,
                refund_text: money(row.refund_amount),
                date_text: dateTime(row.created_at),
                items_text: (row.items || []).map((item) => `${item.product_name}×${item.qty}`).join('、'),
                tag_class: TAG_CLASS[row.status] || 'tag',
            }));
            this.setData({
                list,
                pendingCount: list.filter((row) => row.status === '待处理').length,
            });
        }
        catch (err) {
            toastError(err);
        }
        finally {
            this.setData({ loading: false });
        }
    },
    onTab(e) {
        this.setData({ activeTab: e.currentTarget.dataset.tab });
        this.load();
    },
    goDetail(e) {
        nav('/pages/aftersales/edit?id=' + e.currentTarget.dataset.id);
    },
    goOrders() {
        switchTab('/pages/orders/orders');
    },
});
