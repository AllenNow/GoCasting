import { call, toastError } from '../../utils/api';
import { getMe } from '../../utils/auth';
import { money } from '../../utils/format';
import { back, toast } from '../../utils/ui';
function num(value) {
    const n = Number(value);
    return isFinite(n) ? n : 0;
}
Page({
    data: {
        loading: true,
        saving: false,
        scan: false,
        productId: '',
        products: [],
        productNames: [],
        pickerIndex: 0,
        productName: '',
        qty: '1',
        unit_price: '',
        freight: '',
        other_cost: '',
        note: '',
        warehouses: [],
        warehouseNames: [],
        warehouseIndex: 0,
        previewUnit: '0.00',
        previewTotal: '0.00',
        showCost: true,
    },
    onLoad(options) {
        this.setData({
            productId: options && options.product_id ? String(options.product_id) : '',
            scan: !!(options && options.scan === '1'),
        });
        this.init();
    },
    async init() {
        try {
            const me = await getMe();
            const role = me.user ? me.user.role : '';
            this.setData({ showCost: ['owner', 'operator', 'finance'].indexOf(role) >= 0 });
            const productRes = await call('product.list', { pageSize: 100 });
            const products = productRes.list || [];
            const warehouseRes = await call('warehouse.list');
            const warehouses = warehouseRes.list || [];
            const defaultIndex = Math.max(0, warehouses.findIndex((w) => w.is_default));
            let pickerIndex = 0;
            if (this.data.productId) {
                const found = products.findIndex((p) => p._id === this.data.productId);
                if (found >= 0)
                    pickerIndex = found;
            }
            this.setData({
                products,
                productNames: products.map((p) => `${p.name}${p.sku_code ? ' · ' + p.sku_code : ''}`),
                pickerIndex,
                productId: products[pickerIndex] ? products[pickerIndex]._id : this.data.productId,
                productName: products[pickerIndex] ? products[pickerIndex].name : '',
                warehouses,
                warehouseNames: warehouses.map((w) => w.name),
                warehouseIndex: defaultIndex,
            });
            this.compute();
            if (this.data.scan)
                this.onScan();
        }
        catch (err) {
            toastError(err);
        }
        finally {
            this.setData({ loading: false });
        }
    },
    compute() {
        const qty = num(this.data.qty);
        const unitPrice = num(this.data.unit_price);
        const freight = num(this.data.freight);
        const other = num(this.data.other_cost);
        const total = qty * unitPrice + freight + other;
        this.setData({
            previewUnit: money(qty > 0 ? total / qty : 0),
            previewTotal: money(total),
        });
    },
    onField(e) {
        const field = e.currentTarget.dataset.field;
        this.setData({ [field]: e.detail.value });
        this.compute();
    },
    onPickProduct(e) {
        const index = Number(e.detail.value);
        const product = this.data.products[index];
        this.setData({
            pickerIndex: index,
            productId: product ? product._id : '',
            productName: product ? product.name : '',
        });
    },
    onPickWarehouse(e) {
        this.setData({ warehouseIndex: Number(e.detail.value) });
    },
    onScan() {
        wx.scanCode({
            success: async (res) => {
                const code = String(res.result || '');
                if (!code)
                    return;
                try {
                    const r = await call('product.list', { keyword: code, pageSize: 20 });
                    const list = r.list || [];
                    const index = list.findIndex((p) => p.barcode === code || p.sku_code === code);
                    if (index >= 0) {
                        const product = list[index];
                        const globalIndex = this.data.products.findIndex((p) => p._id === product._id);
                        this.setData({
                            pickerIndex: globalIndex >= 0 ? globalIndex : 0,
                            productId: product._id,
                            productName: product.name,
                        });
                        toast(`已选择 ${product.name}`);
                    }
                    else {
                        toast('未匹配到商品，请手动选择');
                    }
                }
                catch (err) {
                    toastError(err);
                }
            },
            fail: () => toast('已取消扫码'),
        });
    },
    async onSave() {
        if (!this.data.productId) {
            toast('请选择商品');
            return;
        }
        if (!(num(this.data.qty) > 0)) {
            toast('入库数量必须大于 0');
            return;
        }
        if (!(num(this.data.unit_price) > 0)) {
            toast('请填写进价，入库成本必须大于 0');
            return;
        }
        if (!this.data.warehouses[this.data.warehouseIndex]) {
            toast('请先创建仓库');
            return;
        }
        if (this.data.saving)
            return;
        this.setData({ saving: true });
        try {
            const warehouse = this.data.warehouses[this.data.warehouseIndex];
            await call('inventory.stockin', {
                product_id: this.data.productId,
                warehouse_id: warehouse._id,
                qty: num(this.data.qty),
                unit_price: num(this.data.unit_price),
                freight: num(this.data.freight),
                other_cost: num(this.data.other_cost),
                note: this.data.note,
            });
            toast('入库成功', 'success');
            setTimeout(() => back(), 400);
        }
        catch (err) {
            toastError(err);
        }
        finally {
            this.setData({ saving: false });
        }
    },
});
