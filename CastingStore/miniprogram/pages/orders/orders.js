import { call, toastError } from '../../utils/api';
import { getMe } from '../../utils/auth';
import { dateOnly, money } from '../../utils/format';
import { nav } from '../../utils/ui';
const TABS = ['全部', '待付款', '待发货', '已发货', '已完成', '已退款', '已取消'];
const TAG_CLASS = {
    待付款: 'tag-warn',
    待发货: 'tag-warn',
    已发货: 'tag-primary',
    已完成: 'tag-primary',
    退款中: 'tag-danger',
    已退款: 'tag',
    已取消: 'tag',
};
Page({
    data: {
        loading: true,
        list: [],
        tabs: TABS,
        activeTab: '全部',
        keyword: '',
        showCost: false,
        totalSales: '0.00',
        totalProfit: '0.00',
        totalOrders: 0,
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
            const me = await getMe();
            const role = me.user ? me.user.role : '';
            const status = this.data.activeTab === '全部' ? '' : this.data.activeTab;
            const res = await call('order.list', {
                status,
                keyword: this.data.keyword,
                limit: 50,
            });
            let sales = 0;
            let profit = 0;
            const list = res.list.map((order) => {
                if (['待发货', '已发货', '已完成'].indexOf(order.status) >= 0) {
                    sales += Number(order.net_paid !== undefined && order.net_paid !== null ? order.net_paid : order.paid_amount || 0);
                    profit += Number(order.profit || 0);
                }
                return {
                    ...order,
                    paid_text: money(order.paid_amount),
                    profit_text: money(order.profit),
                    date_text: dateOnly(order.created_at),
                    tag_class: TAG_CLASS[order.status] || 'tag',
                };
            });
            this.setData({
                list,
                showCost: ['owner', 'operator', 'finance'].indexOf(role) >= 0,
                totalSales: money(sales),
                totalProfit: money(profit),
                totalOrders: list.length,
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
    onKeyword(e) {
        this.setData({ keyword: e.detail.value });
    },
    doSearch() {
        this.load();
    },
    goDetail(e) {
        nav('/pages/orders/detail?id=' + e.currentTarget.dataset.id);
    },
    goNew() {
        nav('/pages/orders/edit');
    },
    goAfterSales() {
        nav('/pages/aftersales/list');
    },
});
