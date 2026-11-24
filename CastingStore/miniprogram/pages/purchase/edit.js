import { call, toastError } from '../../utils/api';
import { can, getMe } from '../../utils/auth';
import { money, dateOnly } from '../../utils/format';
import { back, confirm, nav, toast } from '../../utils/ui';
function num(value) {
    const n = Number(value);
    return isFinite(n) ? n : 0;
}
Page({
    data: {
        id: '',
        loading: true,
        saving: false,
        received: false,
        partial: false,
        locked: false,
        showCost: false,
        canSave: false,
        canReceive: false,
        canDelete: false,
        canPay: false,
        payStatus: '未付款',
        paidAmount: 0,
        paidText: '0.00',
        unpaidText: '0.00',
        payments: [],
        cashAccounts: [],
        cashAccountNames: ['不记入资金账户'],
        cashIndex: 0,
        payAmount: '',
        payNote: '',
        receiving: false,
        suppliers: [],
        supplierNames: [],
        supplierIndex: 0,
        warehouses: [],
        warehouseNames: [],
        warehouseIndex: 0,
        products: [],
        productNames: [],
        pickerIndex: 0,
        itemQty: '1',
        itemPrice: '',
        items: [],
        freight: '',
        other_cost: '',
        purchase_channel: '',
        channel_order_no: '',
        tracking_no: '',
        note: '',
        goodsAmount: '0.00',
        totalAmount: '0.00',
        receivedText: '',
    },
    onLoad(options) {
        const id = options && options.id ? String(options.id) : '';
        this.setData({ id });
        wx.setNavigationBarTitle({ title: id ? '采购单详情' : '新建采购单' });
        this.init();
    },
    async init() {
        try {
            const me = await getMe();
            const role = me.user ? me.user.role : '';
            const canSave = can('purchase', 'create') || can('purchase', 'update');
            const supplierRes = await call('supplier.list');
            const suppliers = supplierRes.list || [];
            const productRes = await call('product.list', { pageSize: 100 });
            const products = productRes.list || [];
            const warehouseRes = await call('warehouse.list');
            const warehouses = warehouseRes.list || [];
            const canPay = can('purchase', 'pay');
            let cashAccounts = [];
            if (canPay) {
                try {
                    const cashRes = await call('cash.accounts');
                    cashAccounts = cashRes.list || [];
                }
                catch (err) {
                    cashAccounts = [];
                }
            }
            this.setData({
                suppliers,
                supplierNames: suppliers.map((s) => s.name),
                products,
                productNames: products.map((p) => `${p.name}${p.sku_code ? ' · ' + p.sku_code : ''}`),
                warehouses,
                warehouseNames: warehouses.map((w) => w.name),
                warehouseIndex: Math.max(0, warehouses.findIndex((w) => w.is_default)),
                showCost: ['owner', 'operator', 'finance'].indexOf(role) >= 0,
                canSave,
                canReceive: can('purchase', 'receive'),
                canDelete: can('purchase', 'delete'),
                canPay,
                cashAccounts,
                cashAccountNames: ['不记入资金账户'].concat(cashAccounts.map((item) => `${item.name}（¥${money(item.balance)}）`)),
            });
            if (this.data.id)
                await this.loadOrder();
            this.compute();
        }
        catch (err) {
            toastError(err);
        }
        finally {
            this.setData({ loading: false });
        }
    },
    async loadOrder() {
        const res = await call('purchase.get', { id: this.data.id });
        const order = res.order;
        const supplierIndex = Math.max(0, this.data.suppliers.findIndex((s) => s._id === order.supplier_id));
        const warehouseIndex = Math.max(0, this.data.warehouses.findIndex((w) => w._id === order.warehouse_id));
        const items = (order.items || []).map((item) => {
            const receivedQty = Number(item.received_qty || 0);
            const remaining = Math.max(0, Math.round((Number(item.qty || 0) - receivedQty) * 100) / 100);
            return {
                ...item,
                price_text: money(item.unit_price),
                amount_text: money(item.amount),
                received_text: String(receivedQty),
                remaining,
                receiveQty: String(remaining),
            };
        });
        const paid = Number(order.paid_amount || 0);
        const total = Number(order.total_cost || 0);
        const received = order.status === '已入库';
        const partial = order.status === '部分到货';
        this.setData({
            received,
            partial,
            locked: received || partial,
            supplierIndex,
            warehouseIndex: order.warehouse_id ? warehouseIndex : this.data.warehouseIndex,
            items,
            freight: order.freight ? String(order.freight) : '',
            other_cost: order.other_cost ? String(order.other_cost) : '',
            purchase_channel: order.purchase_channel || '',
            channel_order_no: order.channel_order_no || '',
            tracking_no: order.tracking_no || '',
            note: order.note || '',
            receivedText: order.received_at ? dateOnly(order.received_at) : '',
            payStatus: order.pay_status || '未付款',
            paidAmount: paid,
            paidText: money(paid),
            unpaidText: money(Math.max(0, total - paid)),
            payAmount: String(Math.max(0, Math.round((total - paid) * 100) / 100)),
            payments: (order.payments || []).map((payment) => ({
                ...payment,
                amount_text: money(payment.amount),
                date_text: dateOnly(payment.paid_at),
            })),
        });
    },
    onField(e) {
        const field = e.currentTarget.dataset.field;
        this.setData({ [field]: e.detail.value });
        this.compute();
    },
    onSupplier(e) {
        this.setData({ supplierIndex: Number(e.detail.value) });
    },
    onWarehouse(e) {
        this.setData({ warehouseIndex: Number(e.detail.value) });
    },
    onPickProduct(e) {
        this.setData({ pickerIndex: Number(e.detail.value) });
    },
    onAddItem() {
        const product = this.data.products[this.data.pickerIndex];
        if (!product) {
            toast('请先选择商品');
            return;
        }
        const qty = num(this.data.itemQty) || 1;
        const price = num(this.data.itemPrice);
        if (!(price > 0)) {
            toast('请填写采购单价，成本必须大于 0');
            return;
        }
        const items = this.data.items.slice();
        items.push({
            product_id: product._id,
            product_name: product.name,
            sku_code: product.sku_code,
            qty,
            unit_price: price,
            amount: price * qty,
            price_text: money(price),
            amount_text: money(price * qty),
        });
        this.setData({ items, itemQty: '1', itemPrice: '' });
        this.compute();
    },
    onRemoveItem(e) {
        const index = Number(e.currentTarget.dataset.index);
        const items = this.data.items.slice();
        items.splice(index, 1);
        this.setData({ items });
        this.compute();
    },
    compute() {
        const goods = this.data.items.reduce((sum, item) => sum + Number(item.unit_price || 0) * Number(item.qty || 0), 0);
        const freight = num(this.data.freight);
        const other = num(this.data.other_cost);
        this.setData({
            goodsAmount: money(goods),
            totalAmount: money(goods + freight + other),
        });
    },
    async onSave() {
        if (!this.data.suppliers[this.data.supplierIndex]) {
            toast('请先新增供应商');
            return;
        }
        if (!this.data.items.length) {
            toast('请添加采购商品');
            return;
        }
        if (this.data.items.some((item) => !(Number(item.unit_price) > 0))) {
            toast('每件商品都需要填写采购单价');
            return;
        }
        if (this.data.saving)
            return;
        this.setData({ saving: true });
        try {
            const supplier = this.data.suppliers[this.data.supplierIndex];
            const warehouse = this.data.warehouses[this.data.warehouseIndex];
            const res = await call('purchase.save', {
                id: this.data.id || undefined,
                supplier_id: supplier._id,
                supplier_name: supplier.name,
                warehouse_id: warehouse ? warehouse._id : '',
                freight: num(this.data.freight),
                other_cost: num(this.data.other_cost),
                purchase_channel: this.data.purchase_channel,
                channel_order_no: this.data.channel_order_no,
                tracking_no: this.data.tracking_no,
                note: this.data.note,
                items: this.data.items.map((item) => ({
                    product_id: item.product_id,
                    qty: Number(item.qty),
                    unit_price: Number(item.unit_price || 0),
                })),
            });
            toast('已保存', 'success');
            if (!this.data.id) {
                this.setData({ id: res.id });
                wx.redirectTo({ url: '/pages/purchase/edit?id=' + res.id });
            }
            else {
                await this.loadOrder();
            }
        }
        catch (err) {
            toastError(err);
        }
        finally {
            this.setData({ saving: false });
        }
    },
    async onSaveMeta() {
        if (!this.data.id) {
            toast('请先保存采购单');
            return;
        }
        if (this.data.saving)
            return;
        this.setData({ saving: true });
        try {
            await call('purchase.save', {
                id: this.data.id,
                purchase_channel: this.data.purchase_channel,
                channel_order_no: this.data.channel_order_no,
                tracking_no: this.data.tracking_no,
            });
            toast('已保存', 'success');
            await this.loadOrder();
        }
        catch (err) {
            toastError(err);
        }
        finally {
            this.setData({ saving: false });
        }
    },
    onReceiveQty(e) {
        const index = Number(e.currentTarget.dataset.index);
        const items = this.data.items.slice();
        if (!items[index])
            return;
        items[index] = { ...items[index], receiveQty: e.detail.value };
        this.setData({ items });
    },
    async onReceive() {
        if (!this.data.id) {
            toast('请先保存采购单');
            return;
        }
        const warehouse = this.data.warehouses[this.data.warehouseIndex];
        if (!warehouse) {
            toast('请先创建仓库');
            return;
        }
        const batch = this.data.items
            .filter((item) => Number(item.receiveQty) > 0)
            .map((item) => ({ product_id: item.product_id, qty: Number(item.receiveQty) }));
        if (!batch.length) {
            toast('请填写本次收货数量');
            return;
        }
        if (!(await confirm('确认收货', `将按金额比例分摊运费与采购费用，更新移动加权平均成本。入库仓库：${warehouse.name}`)))
            return;
        wx.showLoading({ title: '入库中' });
        try {
            const res = await call('purchase.receive', {
                id: this.data.id,
                warehouse_id: warehouse._id,
                items: batch,
            });
            toast(res.partial ? '已部分入库' : '已全部入库', 'success');
            await this.loadOrder();
        }
        catch (err) {
            toastError(err);
        }
        finally {
            wx.hideLoading();
        }
    },
    onCashAccount(e) {
        this.setData({ cashIndex: Number(e.detail.value) });
    },
    onPayAmount(e) {
        this.setData({ payAmount: e.detail.value });
    },
    onPayNote(e) {
        this.setData({ payNote: e.detail.value });
    },
    async onPay() {
        const amount = Number(this.data.payAmount);
        if (!(amount > 0)) {
            toast('请填写付款金额');
            return;
        }
        const account = this.data.cashIndex > 0 ? this.data.cashAccounts[this.data.cashIndex - 1] : null;
        if (!(await confirm('确认付款', `付款 ¥${amount.toFixed(2)}${account ? '，记入「' + account.name + '」支出' : ''}`)))
            return;
        try {
            await call('purchase.pay', {
                id: this.data.id,
                amount,
                account_id: account ? account._id : '',
                note: this.data.payNote,
            });
            toast('已登记付款', 'success');
            this.setData({ payNote: '' });
            await this.loadOrder();
            if (this.data.canPay) {
                try {
                    const cashRes = await call('cash.accounts');
                    const cashAccounts = cashRes.list || [];
                    this.setData({
                        cashAccounts,
                        cashAccountNames: ['不记入资金账户'].concat(cashAccounts.map((item) => `${item.name}（¥${money(item.balance)}）`)),
                    });
                }
                catch (err) {
                    // 忽略资金账户刷新失败
                }
            }
        }
        catch (err) {
            toastError(err);
        }
    },
    async onDelete() {
        if (!(await confirm('删除采购单', '删除后不可恢复。')))
            return;
        try {
            await call('purchase.remove', { id: this.data.id });
            toast('已删除', 'success');
            setTimeout(() => back(), 400);
        }
        catch (err) {
            toastError(err);
        }
    },
    goSuppliers() {
        nav('/pages/suppliers/suppliers');
    },
});
