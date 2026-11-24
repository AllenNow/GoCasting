import { call, toastError } from '../../utils/api';
import { can, getMe } from '../../utils/auth';
import { AFTER_SALE_TYPES } from '../../utils/config';
import { dateTime, money } from '../../utils/format';
import { back, confirm, nav, toast } from '../../utils/ui';

Page({
    data: {
        mode: 'create',
        loading: true,
        recordId: '',
        orderId: '',
        order: null,
        record: null,
        types: AFTER_SALE_TYPES,
        typeIndex: 0,
        items: [],
        refund_amount: '',
        reason: '',
        note: '',
        restock: false,
        isDropship: false,
        shipped: false,
        showCost: false,
        warehouses: [],
        warehouseNames: [],
        warehouseIndex: 0,
        canUpdate: false,
        canDelete: false,
        remainText: '0.00',
        returnCostText: '0.00',
        refundText: '0.00',
        lossText: '0.00',
        dateText: '',
        completedText: '',
    },
    onLoad(options) {
        const id = options && options.id ? String(options.id) : '';
        const orderId = options && options.order_id ? String(options.order_id) : '';
        this.setData({
            recordId: id,
            orderId,
            mode: id ? 'view' : 'create',
        });
        wx.setNavigationBarTitle({ title: id ? '售后单详情' : '新建售后单' });
        this.init();
    },
    async init() {
        try {
            const me = await getMe();
            const role = me.user ? me.user.role : '';
            this.setData({ showCost: ['owner', 'operator', 'finance'].indexOf(role) >= 0 });
            if (this.data.mode === 'view') {
                await this.loadRecord();
            }
            else {
                await this.loadOrder();
            }
            await this.loadWarehouses();
        }
        catch (err) {
            toastError(err);
        }
        finally {
            this.setData({ loading: false });
        }
    },
    async loadWarehouses() {
        try {
            const res = await call('warehouse.list');
            const warehouses = res.list || [];
            const index = Math.max(0, warehouses.findIndex((item) => item.is_default));
            const patch = {
                warehouses,
                warehouseNames: warehouses.map((item) => item.name),
                warehouseIndex: index,
            };
            if (this.data.record && this.data.record.warehouse_id) {
                const recordIndex = warehouses.findIndex((item) => item._id === this.data.record.warehouse_id);
                if (recordIndex >= 0) patch.warehouseIndex = recordIndex;
            }
            this.setData(patch);
        }
        catch (err) {
            // 角色无仓库查看权限时由云端使用默认仓库
        }
    },
    async loadOrder() {
        const res = await call('order.get', { id: this.data.orderId });
        const order = res.order;
        const shipped = order.status === '已发货' || order.status === '已完成' || !!order.shipped_at;
        const isDropship = order.fulfill_mode === '代发';
        const items = (order.items || [])
            .filter((item) => Number(item.remaining_qty) > 0)
            .map((item) => ({
                product_id: item.product_id,
                product_name: item.product_name,
                sku_code: item.sku_code || '',
                qty: item.remaining_qty,
                remaining_qty: item.remaining_qty,
                price_text: money(item.price),
                cost_text: money(item.cost_snapshot),
            }));
        const remaining = Number(order.paid_amount || 0) - Number(order.refund_amount || 0);
        this.setData({
            order,
            items,
            shipped,
            isDropship,
            restock: shipped && !isDropship,
            refund_amount: remaining > 0 ? remaining.toFixed(2) : '',
            remainText: money(remaining),
        });
        this.compute();
    },
    async loadRecord() {
        const res = await call('afterSale.get', { id: this.data.recordId });
        const record = res.afterSale;
        const items = (record.items || []).map((item) => ({
            ...item,
            qty_text: item.qty,
            price_text: money(item.price),
            cost_text: money(item.cost_snapshot),
        }));
        const order = res.order;
        const shipped = order ? order.status === '已发货' || order.status === '已完成' || !!order.shipped_at : false;
        this.setData({
            record: {
                ...record,
                items_text: items.map((item) => `${item.product_name}×${item.qty}`).join('、'),
                refund_text: money(record.refund_amount),
                cost_text: money(record.refund_cost),
                loss_text: money(record.loss_amount),
                date_text: dateTime(record.created_at),
                completed_text: record.completed_at ? dateTime(record.completed_at) : '',
            },
            order,
            items,
            refundText: money(record.refund_amount),
            lossText: money(record.loss_amount),
            returnCostText: money(record.return_cost),
            typeIndex: Math.max(0, AFTER_SALE_TYPES.indexOf(record.type)),
            refund_amount: String(record.refund_amount || ''),
            reason: record.reason || '',
            note: record.note || '',
            restock: !!record.restock,
            isDropship: record.fulfill_mode === '代发',
            shipped,
            canUpdate: record.status === '待处理' && can('afterSale', 'update'),
            canDelete: ['待处理', '已拒绝'].indexOf(record.status) >= 0 && can('afterSale', 'delete'),
        });
    },
    onQty(e) {
        const index = Number(e.currentTarget.dataset.index);
        const items = this.data.items.slice();
        items[index].qty = e.detail.value;
        this.setData({ items });
        this.compute();
    },
    onType(e) {
        this.setData({ typeIndex: Number(e.detail.value) });
    },
    onRestock(e) {
        this.setData({ restock: !!e.detail.value });
    },
    onWarehouse(e) {
        this.setData({ warehouseIndex: Number(e.detail.value) });
    },
    onField(e) {
        this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
    },
    compute() {
        const cost = this.data.items.reduce(
            (sum, item) => sum + Number(item.cost_snapshot || 0) * (Number(item.qty) || 0),
            0
        );
        this.setData({ returnCostText: money(cost) });
    },
    async onSave() {
        const items = this.data.items
            .filter((item) => Number(item.qty) > 0)
            .map((item) => ({ product_id: item.product_id, qty: Number(item.qty) }));
        if (!items.length) {
            toast('请至少填写一件退货数量');
            return;
        }
        if (!(Number(this.data.refund_amount) > 0)) {
            toast('请填写退款金额');
            return;
        }
        if (this.data.restock && this.data.warehouses.length && !this.data.warehouses[this.data.warehouseIndex]) {
            toast('请选择退货入库仓库');
            return;
        }
        wx.showLoading({ title: '保存中' });
        try {
            const warehouse = this.data.warehouses[this.data.warehouseIndex];
            await call('afterSale.create', {
                order_id: this.data.orderId,
                type: this.data.types[this.data.typeIndex],
                items,
                refund_amount: Number(this.data.refund_amount),
                restock: this.data.restock,
                warehouse_id: warehouse ? warehouse._id : '',
                reason: this.data.reason,
                note: this.data.note,
            });
            toast('售后单已创建', 'success');
            setTimeout(() => back(), 400);
        }
        catch (err) {
            toastError(err);
        }
        finally {
            wx.hideLoading();
        }
    },
    async onComplete() {
        if (!(await confirm('完成售后', `将退款 ¥${this.data.refundText}，并${this.data.restock ? '回补库存' : '记录损耗'}，确认处理？`)))
            return;
        wx.showLoading({ title: '处理中' });
        try {
            const warehouse = this.data.warehouses[this.data.warehouseIndex];
            await call('afterSale.complete', {
                id: this.data.recordId,
                warehouse_id: warehouse ? warehouse._id : '',
            });
            toast('已处理', 'success');
            await this.loadRecord();
        }
        catch (err) {
            toastError(err);
        }
        finally {
            wx.hideLoading();
        }
    },
    async onReject() {
        const res = await new Promise((resolve) => {
            wx.showModal({
                title: '拒绝售后',
                editable: true,
                placeholderText: '填写拒绝原因',
                success: resolve,
                fail: () => resolve({ confirm: false }),
            });
        });
        if (!res.confirm) return;
        const reason = String(res.content || '').trim();
        if (!reason) {
            toast('请填写拒绝原因');
            return;
        }
        try {
            await call('afterSale.reject', { id: this.data.recordId, reason });
            toast('已拒绝', 'success');
            await this.loadRecord();
        }
        catch (err) {
            toastError(err);
        }
    },
    async onDelete() {
        if (!(await confirm('删除售后单', '删除后不可恢复，确认删除？')))
            return;
        try {
            await call('afterSale.remove', { id: this.data.recordId });
            toast('已删除', 'success');
            setTimeout(() => back(), 400);
        }
        catch (err) {
            toastError(err);
        }
    },
    goOrder() {
        if (this.data.order) {
            nav('/pages/orders/detail?id=' + this.data.order._id);
        }
    },
});
