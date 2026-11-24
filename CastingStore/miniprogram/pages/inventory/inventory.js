import { call, toastError } from '../../utils/api';
import { can, getMe } from '../../utils/auth';
import { money, qty } from '../../utils/format';
import { confirm, nav, toast } from '../../utils/ui';
Page({
    data: {
        loading: true,
        list: [],
        keyword: '',
        filter: 'all',
        showCost: false,
        totalValue: '0.00',
        totalSkus: 0,
        lowStockCount: 0,
        canStockin: false,
        canAdjust: false,
        canCreate: false,
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
            const payload = { keyword: this.data.keyword };
            if (this.data.filter === 'low')
                payload.lowStock = true;
            if (this.data.filter === 'in')
                payload.inStock = true;
            if (this.data.filter === 'value')
                payload.sort = 'value';
            const res = await call('inventory.list', payload);
            let totalValue = 0;
            let lowStockCount = 0;
            const list = (res.list || []).map((row) => {
                totalValue += Number(row.stock_value || 0);
                if (row.stock_qty < row.safety_stock)
                    lowStockCount += 1;
                return {
                    ...row,
                    qty_text: qty(row.stock_qty),
                    repairing_text: qty(row.qty_repairing),
                    repairing: Number(row.qty_repairing || 0) > 0,
                    safety_text: qty(row.safety_stock),
                    value_text: money(row.stock_value),
                    low: row.stock_qty < row.safety_stock,
                    empty: row.stock_qty <= 0,
                };
            });
            this.setData({
                list,
                showCost: ['owner', 'operator', 'finance'].indexOf(role) >= 0,
                totalValue: money(totalValue),
                totalSkus: list.length,
                lowStockCount,
                canStockin: can('inventory', 'stockin'),
                canAdjust: can('inventory', 'adjust'),
                canCreate: can('product', 'create'),
            });
        }
        catch (err) {
            toastError(err);
        }
        finally {
            this.setData({ loading: false });
        }
    },
    onKeyword(e) {
        this.setData({ keyword: e.detail.value });
    },
    doSearch() {
        this.load();
    },
    onFilter(e) {
        this.setData({ filter: e.currentTarget.dataset.filter });
        this.load();
    },
    goDetail(e) {
        nav('/pages/inventory/detail?product_id=' + e.currentTarget.dataset.id);
    },
    goStockin() {
        nav('/pages/inventory/stockin');
    },
    goStocktakes() {
        nav('/pages/stocktake/list');
    },
    goNewProduct() {
        nav('/pages/products/edit');
    },
    onScan() {
        wx.scanCode({
            success: (res) => {
                this.findByCode(String(res.result || ''));
            },
            fail: () => toast('已取消扫码'),
        });
    },
    async findByCode(code) {
        if (!code)
            return;
        try {
            const res = await call('product.list', { keyword: code, pageSize: 20 });
            const hit = (res.list || []).find((p) => p.barcode === code || p.sku_code === code);
            if (hit) {
                nav('/pages/inventory/stockin?product_id=' + hit._id);
                return;
            }
            const go = await confirm('未找到商品', `条码 ${code} 未匹配到商品，去新增？`);
            if (go)
                nav('/pages/products/edit?barcode=' + encodeURIComponent(code));
        }
        catch (err) {
            toastError(err);
        }
    },
});
