import { call, toastError } from '../../utils/api';
import { can, getMe } from '../../utils/auth';
import { dateTime, money, qty } from '../../utils/format';
import { confirm, nav, toast } from '../../utils/ui';
Page({
    data: {
        productId: '',
        loading: true,
        product: null,
        inventory: [],
        txns: [],
        warehouses: [],
        warehouseNames: [],
        showCost: false,
        canStockin: false,
        canAdjust: false,
        canTransfer: false,
        canEdit: false,
        canRepair: false,
        canManageRepair: false,
        repairTotal: '0',
        hasRepairing: false,
        stockTotal: '0',
        adjustModes: ['增加', '减少', '设为'],
        adjustModeIndex: 0,
        adjustWarehouseIndex: 0,
        adjustCurrentText: '0',
        adjustCurrentNum: 0,
        adjustQty: '',
        adjustUnitCost: '',
        adjustReason: '',
    },
    onLoad(options) {
        this.setData({ productId: options && options.product_id ? String(options.product_id) : '' });
        this.load();
    },
    onShow() {
        if (this.data.productId)
            this.load();
    },
    async load() {
        this.setData({ loading: true });
        try {
            const me = await getMe();
            const role = me.user ? me.user.role : '';
            const res = await call('inventory.detail', { product_id: this.data.productId });
            const inventory = (res.inventory || []).map((row) => ({
                ...row,
                qty_text: qty(row.qty_available),
                repairing_text: qty(row.qty_repairing),
                avg_text: money(row.avg_cost),
                last_text: row.last_in_at ? dateTime(row.last_in_at) : '-',
            }));
            const stockTotal = inventory.reduce((sum, row) => sum + Number(row.qty_available || 0), 0);
            const repairTotal = inventory.reduce((sum, row) => sum + Number(row.qty_repairing || 0), 0);
            const txns = (res.txns || []).map((txn) => ({
                ...txn,
                date_text: dateTime(txn.created_at),
                qty_text: `${txn.qty > 0 ? '+' : ''}${qty(txn.qty)}`,
                cost_text: money(txn.unit_cost),
                positive: Number(txn.qty) > 0,
            }));
            const warehouses = res.warehouses || [];
            const currentWarehouse = this.data.warehouses[this.data.adjustWarehouseIndex];
            let adjustWarehouseIndex = 0;
            const keepIndex = currentWarehouse
                ? warehouses.findIndex((item) => item._id === currentWarehouse._id)
                : -1;
            if (keepIndex >= 0) {
                adjustWarehouseIndex = keepIndex;
            }
            else if (inventory[0]) {
                const idx = warehouses.findIndex((item) => item._id === inventory[0].warehouse_id);
                if (idx >= 0)
                    adjustWarehouseIndex = idx;
            }
            this.setData({
                product: res.product,
                inventory,
                txns,
                warehouses,
                warehouseNames: warehouses.map((item) => item.name),
                adjustWarehouseIndex,
                showCost: ['owner', 'operator', 'finance'].indexOf(role) >= 0,
                canStockin: can('inventory', 'stockin'),
                canAdjust: can('inventory', 'adjust'),
                canTransfer: can('inventory', 'transfer') && warehouses.length > 1,
                canEdit: can('product', 'update'),
                canRepair: can('repair', 'create') && ['磕碰', '故障'].indexOf(res.product.condition) >= 0 && stockTotal > 0,
                canManageRepair: can('repair', 'read'),
                repairTotal: qty(repairTotal),
                hasRepairing: repairTotal > 0,
                stockTotal: qty(stockTotal),
            });
            this.updateAdjustCurrent();
        }
        catch (err) {
            toastError(err);
        }
        finally {
            this.setData({ loading: false });
        }
    },
    goStockin() {
        nav('/pages/inventory/stockin?product_id=' + this.data.productId);
    },
    goTransfer() {
        nav('/pages/inventory/transfer?product_id=' + this.data.productId);
    },
    goEdit() {
        nav('/pages/products/edit?id=' + this.data.productId);
    },
    goStocktakes() {
        nav('/pages/stocktake/list');
    },
    goRepair() {
        const warehouse = this.data.warehouses[this.data.adjustWarehouseIndex];
        const query = ['product_id=' + this.data.productId];
        if (warehouse)
            query.push('warehouse_id=' + warehouse._id);
        nav('/pages/repairs/edit?' + query.join('&'));
    },
    goRepairs() {
        nav('/pages/repairs/list?product_id=' + this.data.productId);
    },
    updateAdjustCurrent() {
        const warehouse = this.data.warehouses[this.data.adjustWarehouseIndex];
        const row = warehouse
            ? this.data.inventory.find((item) => item.warehouse_id === warehouse._id)
            : null;
        this.setData({
            adjustCurrentText: qty(row ? row.qty_available : 0),
            adjustCurrentNum: row ? Number(row.qty_available || 0) : 0,
        });
    },
    onAdjustMode(e) {
        this.setData({ adjustModeIndex: Number(e.detail.value) });
    },
    onAdjustWarehouse(e) {
        this.setData({ adjustWarehouseIndex: Number(e.detail.value) });
        this.updateAdjustCurrent();
    },
    onAdjustInput(e) {
        this.setData({ adjustQty: e.detail.value });
    },
    onAdjustUnitCost(e) {
        this.setData({ adjustUnitCost: e.detail.value });
    },
    onAdjustReason(e) {
        this.setData({ adjustReason: e.detail.value });
    },
    async onAdjust() {
        const mode = ['increase', 'decrease', 'set'][this.data.adjustModeIndex];
        if (this.data.adjustQty === '') {
            toast('请填写调整数量');
            return;
        }
        const num = Number(this.data.adjustQty);
        if (!isFinite(num) || num < 0) {
            toast('请填写正确的数量');
            return;
        }
        if (mode !== 'set' && !(num > 0)) {
            toast('数量必须大于 0');
            return;
        }
        const reason = String(this.data.adjustReason || '').trim();
        if (!reason) {
            toast('请填写调整原因');
            return;
        }
        const needCost = mode === 'increase' || (mode === 'set' && num > Number(this.data.adjustCurrentNum || 0));
        const unitCost = Number(this.data.adjustUnitCost);
        if (needCost && !(unitCost > 0)) {
            toast('本次增加库存必须填写单位成本');
            return;
        }
        const warehouse = this.data.warehouses[this.data.adjustWarehouseIndex];
        if (!warehouse) {
            toast('请先创建仓库');
            return;
        }
        const label = this.data.adjustModes[this.data.adjustModeIndex];
        if (!(await confirm('手动调整库存', `${label} ${num}，原因：${reason}。确认提交？`)))
            return;
        try {
            await call('inventory.manualAdjust', {
                product_id: this.data.productId,
                warehouse_id: warehouse._id,
                mode,
                qty: num,
                unit_cost: needCost ? unitCost : 0,
                reason,
            });
            toast('调整完成', 'success');
            this.setData({ adjustQty: '', adjustUnitCost: '', adjustReason: '' });
            await this.load();
        }
        catch (err) {
            toastError(err);
        }
    },
});
