import { call, toastError } from '../../utils/api';
import { can, getMe } from '../../utils/auth';
import { money, moneyShort, percent } from '../../utils/format';
import { nav, toast } from '../../utils/ui';
Page({
    data: {
        loading: true,
        tab: 'profit',
        tabs: [
            { key: 'profit', label: '利润' },
            { key: 'products', label: '商品' },
            { key: 'inventory', label: '库存' },
            { key: 'channels', label: '渠道' },
            { key: 'expenses', label: '费用' },
        ],
        totalSales: '0.00',
        totalProfit: '0.00',
        totalOrders: 0,
        days: [],
        productSkus: 0,
        productSold: 0,
        sellThrough: '0.0%',
        products: [],
        stockValue: '0.00',
        turnoverDays: '0',
        aging: [],
        slow: [],
        channels: [],
        expenseTotal: '0.00',
        expenses: [],
        showCost: false,
        canSettle: false,
        canExport: false,
    },
    onShow() {
        this.load();
    },
    async load() {
        this.setData({ loading: true });
        try {
            const me = await getMe();
            const role = me.user ? me.user.role : '';
            const showCost = ['owner', 'operator', 'finance'].indexOf(role) >= 0;
            this.setData({
                showCost,
                canSettle: can('settlement', 'read'),
                canExport: can('report', 'export'),
            });
            if (this.data.tab === 'profit')
                await this.loadProfit();
            if (this.data.tab === 'products')
                await this.loadProducts();
            if (this.data.tab === 'inventory')
                await this.loadInventory();
            if (this.data.tab === 'channels')
                await this.loadChannels();
            if (this.data.tab === 'expenses')
                await this.loadExpenses();
        }
        catch (err) {
            toastError(err);
        }
        finally {
            this.setData({ loading: false });
        }
    },
    async loadProfit() {
        const res = await call('report.profit', { days: 30 });
        const daily = res.daily || [];
        const max = daily.reduce((m, row) => Math.max(m, Number(row.sales || 0)), 0);
        const days = daily
            .slice()
            .reverse()
            .map((row) => ({
            date: row.date.slice(5),
            sales: moneyShort(row.sales),
            profit: moneyShort(row.profit),
            width: max > 0 ? Math.max(2, Math.round((row.sales / max) * 100)) : 0,
        }));
        this.setData({
            totalSales: money(res.total_sales),
            totalProfit: money(res.total_profit),
            totalOrders: res.total_orders || 0,
            days,
        });
    },
    async loadProducts() {
        const res = await call('report.products', { days: 90 });
        const products = (res.list || []).map((row) => ({
            ...row,
            qty_text: String(row.qty || 0),
            sales_text: moneyShort(row.sales),
            profit_text: moneyShort(row.profit),
            rate_text: percent(row.profit_rate),
            stock_text: String(row.stock || 0),
            idle_text: row.no_sale_days === null ? '近 90 天无销量' : `距上次销售 ${row.no_sale_days} 天`,
            low: Number(row.stock || 0) < Number(row.safety_stock || 0),
        }));
        this.setData({
            productSkus: res.total_skus || 0,
            productSold: res.sold_skus || 0,
            sellThrough: percent(res.sell_through),
            products,
        });
    },
    async loadInventory() {
        const res = await call('report.inventory');
        const aging = (res.aging || []).map((row) => ({
            ...row,
            value_text: moneyShort(row.value),
            width: res.stock_value > 0 ? Math.max(2, Math.round((row.value / res.stock_value) * 100)) : 0,
        }));
        const slow = (res.slow || []).map((row) => ({
            ...row,
            value_text: moneyShort(row.value),
        }));
        this.setData({
            stockValue: money(res.stock_value),
            turnoverDays: String(res.turnover_days || 0),
            aging,
            slow,
        });
    },
    async loadChannels() {
        const res = await call('report.channels', {});
        const channels = (res.list || []).map((row) => ({
            ...row,
            sales_text: moneyShort(row.sales),
            profit_text: moneyShort(row.profit),
            fee_text: moneyShort(row.fee),
        }));
        this.setData({ channels });
    },
    async loadExpenses() {
        const res = await call('report.expenses');
        const max = (res.list || []).reduce((m, row) => Math.max(m, Number(row.amount || 0)), 0);
        const list = (res.list || []).map((row) => ({
            ...row,
            amount_text: money(row.amount),
            ratio_text: percent(row.ratio),
            width: max > 0 ? Math.max(2, Math.round((row.amount / max) * 100)) : 0,
        }));
        this.setData({ expenseTotal: money(res.total), expenses: list });
    },
    onTab(e) {
        this.setData({ tab: e.currentTarget.dataset.key });
        this.load();
    },
    goSettlement() {
        nav('/pages/reports/settlement');
    },
    onExport() {
        const items = [
            { key: 'orders', label: '订单明细（近 30 天）' },
            { key: 'daily', label: '日报汇总（近 30 天）' },
            { key: 'products', label: '商品动销（近 90 天）' },
            { key: 'channels', label: '渠道汇总（本月）' },
            { key: 'expenses', label: '费用结构（本月）' },
            { key: 'inventory', label: '库存明细' },
        ];
        wx.showActionSheet({
            itemList: items.map((item) => item.label),
            success: (res) => {
                const item = items[res.tapIndex];
                if (item)
                    this.doExport(item.key);
            },
        });
    },
    async doExport(type) {
        wx.showLoading({ title: '生成中', mask: true });
        try {
            const res = await call('report.export', { type });
            const filePath = `${wx.env.USER_DATA_PATH}/${res.filename}`;
            await new Promise((resolve, reject) => {
                wx.getFileSystemManager().writeFile({
                    filePath,
                    data: res.content,
                    encoding: 'utf8',
                    success: () => resolve(),
                    fail: (err) => reject(err),
                });
            });
            wx.hideLoading();
            const share = wx.shareFileMessage;
            if (!share) {
                this.copyCsv(res.content);
                return;
            }
            share({
                filePath,
                fileName: res.filename,
                fail: (err) => {
                    if (String(err && err.errMsg).indexOf('cancel') >= 0)
                        return;
                    this.copyCsv(res.content);
                },
            });
        }
        catch (err) {
            wx.hideLoading();
            toastError(err);
        }
    },
    copyCsv(content) {
        wx.setClipboardData({
            data: content.replace(/^\uFEFF/, ''),
            success: () => toast('分享不可用，已复制 CSV 内容，可粘贴到 Excel'),
        });
    },
});
