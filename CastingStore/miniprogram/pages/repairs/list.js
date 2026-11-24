import { call, toastError } from '../../utils/api';
import { can } from '../../utils/auth';
import { dateTime, money, qty } from '../../utils/format';
import { confirm, nav, toast } from '../../utils/ui';

const TABS = ['全部', '维修中', '已完成', '已取消'];
const TAG_CLASS = {
    维修中: 'tag-warn',
    已完成: 'tag-primary',
    已取消: 'tag',
};

Page({
    data: {
        loading: true,
        list: [],
        tabs: TABS,
        activeTab: '全部',
        canUpdate: false,
    },
    onLoad(options) {
        this.productId = options && options.product_id ? String(options.product_id) : '';
        this.load();
    },
    onShow() {
        if (this.loaded)
            this.load();
        this.loaded = true;
    },
    onPullDownRefresh() {
        this.load().then(() => wx.stopPullDownRefresh());
    },
    async load() {
        this.setData({ loading: true });
        try {
            const status = this.data.activeTab === '全部' ? '' : this.data.activeTab;
            const res = await call('repair.list', {
                product_id: this.productId,
                status,
            });
            const list = (res.list || []).map((row) => ({
                ...row,
                date_text: dateTime(row.created_at),
                completed_text: row.completed_at ? dateTime(row.completed_at) : '',
                qty_text: qty(row.qty),
                cost_text: money(row.repair_cost),
                tag_class: TAG_CLASS[row.status] || 'tag',
                pending: row.status === '维修中',
            }));
            this.setData({
                list,
                canUpdate: can('repair', 'update'),
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
        const tab = e.currentTarget.dataset.tab;
        if (tab === this.data.activeTab)
            return;
        this.setData({ activeTab: tab });
        this.load();
    },
    onDetail(e) {
        nav('/pages/repairs/edit?id=' + e.currentTarget.dataset.id);
    },
    async onComplete(e) {
        const item = this.data.list.find((row) => row._id === e.currentTarget.dataset.id);
        if (!item)
            return;
        const ok = await confirm('完成维修', `确认 ${item.product_name} 的 ${item.qty_text} 件维修已完成？修复费用 ¥${item.cost_text} 将计入库存成本。`);
        if (!ok)
            return;
        try {
            await call('repair.complete', { id: item._id });
            toast('已完成', 'success');
            this.load();
        }
        catch (err) {
            toastError(err);
        }
    },
    async onCancel(e) {
        const item = this.data.list.find((row) => row._id === e.currentTarget.dataset.id);
        if (!item)
            return;
        const ok = await confirm('取消维修', `确认取消维修单 ${item.no}？数量将退回可用库存。`);
        if (!ok)
            return;
        try {
            await call('repair.cancel', { id: item._id });
            toast('已取消', 'success');
            this.load();
        }
        catch (err) {
            toastError(err);
        }
    },
});
