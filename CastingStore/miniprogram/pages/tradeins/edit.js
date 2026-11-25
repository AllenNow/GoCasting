import { call, toastError } from '../../utils/api';
import { can } from '../../utils/auth';
import { dateTime, money } from '../../utils/format';
import { confirm, nav, toast } from '../../utils/ui';

Page({
    data: {
        id: '',
        loading: true,
        saving: false,
        tradeIn: null,
        order: null,
        repair: null,
        dismantle: null,
        warehouses: [],
        warehouseNames: [],
        warehouseIndex: 0,
        qty: '1',
        creditText: '0.00',
        dateText: '',
        intakeText: '',
        tagClass: 'tag',
        canIntake: false,
        canCancel: false,
        canDispose: false,
        canRepair: false,
        canDismantle: false,
    },
    onLoad(options) {
        this.tradeInId = options && options.id ? String(options.id) : '';
        this.load();
    },
    async load() {
        this.setData({ loading: true });
        try {
            const res = await call('tradeIn.get', { id: this.tradeInId });
            const tradeIn = res.tradeIn;
            let warehouses = [];
            try {
                const wh = await call('warehouse.list', {});
                warehouses = wh.list || [];
            }
            catch (err) {
                warehouses = [];
            }
            let warehouseIndex = 0;
            if (tradeIn.warehouse_id) {
                const idx = warehouses.findIndex((row) => row._id === tradeIn.warehouse_id);
                if (idx >= 0)
                    warehouseIndex = idx;
            }
            const status = tradeIn.status;
            const tagClass = ['待回收', '待处置', '维修中'].indexOf(status) >= 0
                ? 'tag-warn'
                : ['已维修', '已拆解'].indexOf(status) >= 0
                    ? 'tag-primary'
                    : 'tag';
            this.setData({
                tradeIn,
                order: res.order || null,
                repair: res.repair || null,
                dismantle: res.dismantle || null,
                warehouses,
                warehouseNames: warehouses.map((row) => row.name),
                warehouseIndex,
                qty: String(tradeIn.qty || 1),
                creditText: money(tradeIn.credit_amount),
                dateText: dateTime(tradeIn.created_at),
                intakeText: tradeIn.intake_at ? dateTime(tradeIn.intake_at) : '',
                tagClass,
                canIntake: status === '待回收' && can('tradeIn', 'create'),
                canCancel: status === '待回收' && can('tradeIn', 'update'),
                canDispose: status === '待处置' && can('tradeIn', 'update'),
                canRepair: status === '待处置' && can('repair', 'create'),
                canDismantle: status === '待处置' && can('dismantle', 'create'),
            });
        }
        catch (err) {
            toastError(err);
        }
        finally {
            this.setData({ loading: false });
        }
    },
    onWarehouse(e) {
        this.setData({ warehouseIndex: Number(e.detail.value) });
    },
    onQty(e) {
        this.setData({ qty: e.detail.value });
    },
    async onIntake() {
        const warehouse = this.data.warehouses[this.data.warehouseIndex];
        if (!warehouse) {
            toast('请选择仓库');
            return;
        }
        const num = Number(this.data.qty);
        if (!(num > 0)) {
            toast('请填写回收数量');
            return;
        }
        const ok = await confirm(
            '旧竿入库',
            `确认按折价 ¥${this.data.creditText} 将旧竿入「${warehouse.name}」？入库后状态变为待处置。`
        );
        if (!ok)
            return;
        this.setData({ saving: true });
        try {
            await call('tradeIn.intake', {
                id: this.tradeInId,
                warehouse_id: warehouse._id,
                qty: num,
            });
            toast('已入库', 'success');
            this.load();
        }
        catch (err) {
            toastError(err);
        }
        finally {
            this.setData({ saving: false });
        }
    },
    async onCancel() {
        const ok = await confirm('取消回收单', '确认取消这张回收单？仅未入库的回收单可以取消。');
        if (!ok)
            return;
        try {
            await call('tradeIn.cancel', { id: this.tradeInId });
            toast('已取消', 'success');
            this.load();
        }
        catch (err) {
            toastError(err);
        }
    },
    goRepair() {
        const tradeIn = this.data.tradeIn;
        if (!tradeIn)
            return;
        nav(
            `/pages/repairs/edit?trade_in_id=${tradeIn._id}&product_id=${tradeIn.product_id || ''}&warehouse_id=${tradeIn.warehouse_id || ''}`
        );
    },
    goDismantle() {
        const tradeIn = this.data.tradeIn;
        if (!tradeIn)
            return;
        nav(
            `/pages/dismantles/edit?trade_in_id=${tradeIn._id}&source_product_id=${tradeIn.product_id || ''}&warehouse_id=${tradeIn.warehouse_id || ''}`
        );
    },
    goRepairDetail() {
        if (this.data.repair)
            nav('/pages/repairs/edit?id=' + this.data.repair._id);
    },
    goDismantleDetail() {
        if (this.data.dismantle)
            nav('/pages/dismantles/edit?id=' + this.data.dismantle._id);
    },
    goOrder() {
        if (this.data.order)
            nav('/pages/orders/detail?id=' + this.data.order._id);
    },
});
