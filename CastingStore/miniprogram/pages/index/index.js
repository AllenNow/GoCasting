import { call, toastError } from '../../utils/api';
import { bootstrap, can, getMe } from '../../utils/auth';
import { money, percent } from '../../utils/format';
import { nav, prompt, switchTab, toast } from '../../utils/ui';
Page({
    data: {
        loading: true,
        needInit: false,
        hasUser: false,
        openid: '',
        userName: '',
        roleLabel: '',
        showCost: false,
        monthSales: '0.00',
        monthProfit: '0.00',
        monthProfitRate: '0.0%',
        todaySales: '0.00',
        todayOrders: 0,
        pendingShip: 0,
        lowStock: 0,
        slowMoving: 0,
        stockValue: '0.00',
        stockSkus: 0,
        cashBalance: '',
        canCash: false,
        unpaidPurchase: 0,
        pendingAfterSale: 0,
        dropshipUnsettled: 0,
        pendingSettlement: 0,
        monthStocktakeDone: false,
        monthStocktakeCount: 0,
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
            const me = await getMe(true);
            if (me.needInit) {
                this.setData({ loading: false, needInit: true, hasUser: false });
                return;
            }
            if (!me.user) {
                this.setData({ loading: false, needInit: false, hasUser: false, openid: me.openid || '' });
                return;
            }
            const role = me.user.role;
            const showCost = ['owner', 'operator', 'finance'].indexOf(role) >= 0;
            this.setData({
                hasUser: true,
                needInit: false,
                userName: me.user.name,
                roleLabel: me.user.role_label,
                showCost,
                canCash: can('cash', 'read'),
            });
            await this.loadDashboard();
        }
        catch (err) {
            toastError(err);
        }
        finally {
            this.setData({ loading: false });
        }
    },
    async loadDashboard() {
        const data = await call('report.dashboard');
        this.setData({
            monthSales: money(data.month_sales),
            monthProfit: money(data.month_profit),
            monthProfitRate: percent(data.month_profit_rate),
            todaySales: money(data.today_sales),
            todayOrders: data.today_orders || 0,
            pendingShip: data.pending_ship || 0,
            lowStock: data.low_stock || 0,
            slowMoving: data.slow_moving || 0,
            stockValue: money(data.stock_value),
            stockSkus: data.stock_skus || 0,
            cashBalance: data.cash_balance === null || data.cash_balance === undefined ? '' : money(data.cash_balance),
            unpaidPurchase: data.unpaid_purchase || 0,
            pendingAfterSale: data.pending_after_sale || 0,
            dropshipUnsettled: data.dropship_unsettled || 0,
            pendingSettlement: data.pending_settlement || 0,
            monthStocktakeDone: !!data.month_stocktake_done,
            monthStocktakeCount: data.month_stocktake_count || 0,
        });
    },
    async onInit() {
        const name = await prompt('初始化系统', '你的称呼，如：老板');
        if (name === null)
            return;
        wx.showLoading({ title: '初始化中' });
        try {
            await bootstrap(name.trim() || '老板');
            toast('初始化完成', 'success');
            await this.load();
        }
        catch (err) {
            toastError(err);
        }
        finally {
            wx.hideLoading();
        }
    },
    onCopyOpenid() {
        wx.setClipboardData({
            data: this.data.openid,
            success: () => toast('已复制，发给老板分配角色'),
        });
    },
    goOrders() {
        switchTab('/pages/orders/orders');
    },
    goInventory() {
        switchTab('/pages/inventory/inventory');
    },
    goReports() {
        switchTab('/pages/reports/reports');
    },
    goNewOrder() {
        nav('/pages/orders/edit');
    },
    goNewPurchase() {
        nav('/pages/purchase/edit');
    },
    goStockin() {
        nav('/pages/inventory/stockin?scan=1');
    },
    goProducts() {
        switchTab('/pages/inventory/inventory');
    },
    goCash() {
        nav('/pages/cash/cash');
    },
    goPurchase() {
        nav('/pages/purchase/purchase');
    },
    goAfterSales() {
        nav('/pages/aftersales/list');
    },
    goStocktakes() {
        nav('/pages/stocktake/list');
    },
});
