import { call, toastError } from '../../utils/api';
import { dateOnly, money } from '../../utils/format';
import { nav } from '../../utils/ui';
const TABS = ['全部', '已下单', '在途', '部分到货', '已入库'];
const TAG_CLASS = {
    草稿: 'tag',
    已下单: 'tag-warn',
    在途: 'tag-warn',
    部分到货: 'tag-warn',
    已入库: 'tag-primary',
};
Page({
    data: {
        loading: true,
        list: [],
        tabs: TABS,
        activeTab: '全部',
        totalAmount: '0.00',
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
            const res = await call('purchase.list', { status });
            let total = 0;
            const list = (res.list || []).map((order) => {
                total += Number(order.total_cost || 0);
                return {
                    ...order,
                    total_text: money(order.total_cost),
                    date_text: dateOnly(order.created_at),
                    tag_class: TAG_CLASS[order.status] || 'tag',
                    item_count: (order.items || []).length,
                    pay_text: order.pay_status || '未付款',
                    unpaid: order.pay_status !== '已付款',
                };
            });
            this.setData({ list, totalAmount: money(total) });
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
        nav('/pages/purchase/edit?id=' + e.currentTarget.dataset.id);
    },
    goNew() {
        nav('/pages/purchase/edit');
    },
    goSuppliers() {
        nav('/pages/suppliers/suppliers');
    },
});
