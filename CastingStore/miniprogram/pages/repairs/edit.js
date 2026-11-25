import { call, toastError } from '../../utils/api';
import { can } from '../../utils/auth';
import { dateTime, money, qty } from '../../utils/format';
import { back, confirm, toast } from '../../utils/ui';

Page({
    data: {
        loading: true,
        saving: false,
        isView: false,
        canUpdate: false,
        product: null,
        warehouses: [],
        warehouseNames: [],
        warehouseIndex: 0,
        maxQtyText: '0',
        maxQty: 0,
        qty: '',
        repairChannel: '',
        repairMethod: '',
        repairCost: '',
        note: '',
        targetProducts: [],
        targetProductNames: [],
        targetIndex: 0,
        targetProductId: '',
        parts: [],
        partOptions: [],
        partNames: [],
        partIndex: 0,
        partQty: '',
        partsCostText: '0.00',
        totalCostText: '0.00',
        repair: null,
        qtyText: '0',
        costText: '0.00',
        dateText: '',
        completedText: '',
    },
    onLoad(options) {
        this.repairId = options && options.id ? String(options.id) : '';
        this.productId = options && options.product_id ? String(options.product_id) : '';
        this.presetWarehouseId = options && options.warehouse_id ? String(options.warehouse_id) : '';
        this.tradeInId = options && options.trade_in_id ? String(options.trade_in_id) : '';
        this.loadProducts();
        if (this.repairId) {
            wx.setNavigationBarTitle({ title: '维修单' });
            this.loadRepair();
        }
        else {
            wx.setNavigationBarTitle({ title: '发起维修' });
            this.loadProduct();
        }
    },
    async loadProducts() {
        try {
            const res = await call('product.list', { limit: 200 });
            const products = (res.list || []).filter((row) => row.status !== '停售');
            this.products = products;
            const targetProducts = products.filter((row) => (row.item_type || '整竿') !== '配件');
            this.setData({
                targetProducts: [null].concat(targetProducts),
                targetProductNames: ['保持原商品（不转 SKU）'].concat(
                    targetProducts.map((row) => `${row.name}（${row.condition || '未标状况'}）`)
                ),
                partOptions: products,
                partNames: products.map((row) => row.name),
            });
            const repair = this.data.repair;
            this.syncTargetIndex(repair && repair.target_product_id ? repair.target_product_id : '');
        }
        catch (err) {
            this.products = [];
        }
    },
    syncTargetIndex(productId) {
        if (!productId)
            return;
        const index = this.data.targetProducts.findIndex((row) => row && row._id === productId);
        if (index >= 0) {
            this.setData({ targetIndex: index, targetProductId: productId });
        }
    },
    onTarget(e) {
        const index = Number(e.detail.value);
        const product = this.data.targetProducts[index];
        this.setData({
            targetIndex: index,
            targetProductId: product ? product._id : '',
        });
    },
    onPartProduct(e) {
        this.setData({ partIndex: Number(e.detail.value) });
    },
    onPartQty(e) {
        this.setData({ partQty: e.detail.value });
    },
    onAddPart() {
        const product = this.data.partOptions[this.data.partIndex];
        const num = Number(this.data.partQty);
        if (!product) {
            toast('请选择配节商品');
            return;
        }
        if (!(num > 0)) {
            toast('请填写配节数量');
            return;
        }
        const parts = this.data.parts.slice();
        const exist = parts.find((row) => row.product_id === product._id);
        if (exist) {
            exist.qty = Number(exist.qty) + num;
        }
        else {
            parts.push({ product_id: product._id, product_name: product.name, qty: num });
        }
        this.setData({ parts, partQty: '' });
    },
    onRemovePart(e) {
        const index = Number(e.currentTarget.dataset.index);
        const parts = this.data.parts.slice();
        parts.splice(index, 1);
        this.setData({ parts });
    },
    async loadProduct() {
        try {
            const res = await call('inventory.detail', { product_id: this.productId });
            this.applyDetail(res, '');
        }
        catch (err) {
            toastError(err);
        }
        finally {
            this.setData({ loading: false });
        }
    },
    async loadRepair() {
        try {
            const repairRes = await call('repair.get', { id: this.repairId });
            const repair = repairRes.repair;
            const detail = await call('inventory.detail', { product_id: repair.product_id });
            this.applyDetail(detail, repair.warehouse_id);
            const parts = (repair.parts || []).map((part) => ({
                ...part,
                amount_text: money(part.amount || 0),
            }));
            this.setData({
                isView: true,
                canUpdate: can('repair', 'update'),
                repair,
                parts,
                qtyText: qty(repair.qty),
                costText: money(repair.repair_cost),
                partsCostText: money(repair.parts_cost),
                totalCostText: money(repair.total_cost || repair.repair_cost),
                qty: String(repair.qty),
                repairChannel: repair.repair_channel || '',
                repairMethod: repair.repair_method || '',
                repairCost: String(repair.repair_cost || ''),
                note: repair.note || '',
                dateText: dateTime(repair.created_at),
                completedText: repair.completed_at ? dateTime(repair.completed_at) : '',
            });
            this.syncTargetIndex(repair.target_product_id || '');
        }
        catch (err) {
            toastError(err);
        }
        finally {
            this.setData({ loading: false });
        }
    },
    applyDetail(res, warehouseId) {
        const product = res.product;
        const warehouses = res.warehouses || [];
        const inventory = res.inventory || [];
        let warehouseIndex = 0;
        const targetId = warehouseId || this.presetWarehouseId;
        if (targetId) {
            const idx = warehouses.findIndex((item) => item._id === targetId);
            if (idx >= 0)
                warehouseIndex = idx;
        }
        this.inventory = inventory;
        this.setData({
            product,
            warehouses,
            warehouseNames: warehouses.map((item) => item.name),
            warehouseIndex,
        });
        this.updateMaxQty();
    },
    updateMaxQty() {
        const warehouse = this.data.warehouses[this.data.warehouseIndex];
        const row = warehouse
            ? (this.inventory || []).find((item) => item.warehouse_id === warehouse._id)
            : null;
        const max = row ? Number(row.qty_available || 0) : 0;
        this.setData({ maxQty: max, maxQtyText: qty(max) });
    },
    onWarehouse(e) {
        this.setData({ warehouseIndex: Number(e.detail.value) });
        this.updateMaxQty();
    },
    onField(e) {
        const field = e.currentTarget.dataset.field;
        this.setData({ [field]: e.detail.value });
    },
    async onSubmit() {
        const warehouse = this.data.warehouses[this.data.warehouseIndex];
        if (!warehouse) {
            toast('请选择仓库');
            return;
        }
        const num = Number(this.data.qty);
        if (!(num > 0)) {
            toast('请填写维修数量');
            return;
        }
        if (num > this.data.maxQty + 0.0001) {
            toast(`可用库存不足，当前 ${this.data.maxQtyText}`);
            return;
        }
        if (!String(this.data.repairChannel || '').trim()) {
            toast('请填写修复渠道');
            return;
        }
        if (!String(this.data.repairMethod || '').trim()) {
            toast('请填写修复方式');
            return;
        }
        if (String(this.data.repairCost).trim() === '') {
            toast('请填写修复费用');
            return;
        }
        if (Number(this.data.repairCost) < 0) {
            toast('修复费用不能为负数');
            return;
        }
        if (this.data.saving)
            return;
        const ok = await confirm('发起维修', `${this.data.product.name} ${num} 件将从可用库存转入维修中，确认提交？`);
        if (!ok)
            return;
        this.setData({ saving: true });
        try {
            await call('repair.create', {
                product_id: this.data.product._id,
                warehouse_id: warehouse._id,
                qty: num,
                repair_channel: this.data.repairChannel.trim(),
                repair_method: this.data.repairMethod.trim(),
                repair_cost: Number(this.data.repairCost),
                target_product_id: this.data.targetProductId || '',
                parts: this.data.parts.map((row) => ({ product_id: row.product_id, qty: Number(row.qty) })),
                trade_in_id: this.tradeInId || '',
                note: this.data.note,
            });
            toast('已发起维修', 'success');
            setTimeout(() => back(), 500);
        }
        catch (err) {
            toastError(err);
        }
        finally {
            this.setData({ saving: false });
        }
    },
    async onComplete() {
        const repair = this.data.repair;
        if (!repair)
            return;
        const ok = await confirm('完成维修', `确认维修已完成？配节成本会先扣减配件库存，修复费用与配节成本将计入${this.data.repair.target_product_id ? '目标 SKU' : '原 SKU'}库存成本。`);
        if (!ok)
            return;
        try {
            await call('repair.complete', { id: repair._id });
            toast('已完成', 'success');
            this.loadRepair();
        }
        catch (err) {
            toastError(err);
        }
    },
    async onCancel() {
        const repair = this.data.repair;
        if (!repair)
            return;
        const ok = await confirm('取消维修', '确认取消这张维修单？数量将退回可用库存。');
        if (!ok)
            return;
        try {
            await call('repair.cancel', { id: repair._id });
            toast('已取消', 'success');
            this.loadRepair();
        }
        catch (err) {
            toastError(err);
        }
    },
});
