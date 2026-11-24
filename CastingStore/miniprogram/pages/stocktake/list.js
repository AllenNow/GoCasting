import { call, toastError } from '../../utils/api';
import { can, getMe } from '../../utils/auth';
import { dateTime, money, qty } from '../../utils/format';
import { nav, toast } from '../../utils/ui';

const TABS = ['全部', '盘点中', '已完成'];
const TAG_CLASS = {
    盘点中: 'tag-warn',
    已完成: 'tag-primary',
};

Page({
    data: {
        loading: true,
        list: [],
        tabs: TABS,
        activeTab: '全部',
        currentPeriod: '',
        createPeriod: '',
        monthCompleted: 0,
        monthPending: 0,
        warehouses: [],
        warehouseNames: [],
        warehouseIndex: 0,
        suppliers: [],
        supplierNames: ['全部供应商'],
        supplierIndex: 0,
        canAdjust: false,
        showCost: false,
        creating: false,
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
            const status = this.data.activeTab === '全部' ? '' : this.data.activeTab;
            const res = await call('stocktake.list', { status });
            const currentPeriod = res.current_period || '';
            const list = (res.list || []).map((row) => ({
                ...row,
                date_text: dateTime(row.created_at),
                completed_text: row.completed_at ? dateTime(row.completed_at) : '',
                tag_class: TAG_CLASS[row.status] || 'tag',
                gain_text: qty(row.gain_qty),
                loss_text: qty(row.loss_qty),
                gain_amount_text: money(row.gain_amount),
                loss_amount_text: money(row.loss_amount),
            }));
            this.setData({
                list,
                currentPeriod,
                createPeriod: this.data.createPeriod || currentPeriod,
                monthCompleted: res.month_completed || 0,
                monthPending: res.month_pending || 0,
                canAdjust: can('inventory', 'adjust'),
                showCost: ['owner', 'operator', 'finance'].indexOf(role) >= 0,
            });
            if (!this.data.warehouses.length) await this.loadWarehouses();
            if (this.data.canAdjust && !this.data.suppliers.length) await this.loadSuppliers();
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
            this.setData({
                warehouses,
                warehouseNames: warehouses.map((item) => item.name),
                warehouseIndex: index,
            });
        }
        catch (err) {
            // 无仓库查看权限时由云端使用默认仓库
        }
    },
    async loadSuppliers() {
        try {
            const res = await call('supplier.list');
            const suppliers = res.list || [];
            this.setData({
                suppliers,
                supplierNames: ['全部供应商'].concat(suppliers.map((item) => item.name)),
                supplierIndex: Math.min(this.data.supplierIndex, suppliers.length),
            });
        }
        catch (err) {
            // 无供应商查看权限时保持“全部供应商”
        }
    },
    onTab(e) {
        this.setData({ activeTab: e.currentTarget.dataset.tab });
        this.load();
    },
    onCreatePeriod(e) {
        this.setData({ createPeriod: e.detail.value });
    },
    onWarehouse(e) {
        this.setData({ warehouseIndex: Number(e.detail.value) });
    },
    onSupplier(e) {
        this.setData({ supplierIndex: Number(e.detail.value) });
    },
    async onCreate() {
        const warehouse = this.data.warehouses[this.data.warehouseIndex];
        if (!warehouse) {
            toast('请先创建仓库');
            return;
        }
        const supplier = this.data.supplierIndex > 0 ? this.data.suppliers[this.data.supplierIndex - 1] : null;
        this.setData({ creating: true });
        wx.showLoading({ title: '创建中' });
        try {
            const res = await call('stocktake.create', {
                warehouse_id: warehouse._id,
                period: this.data.createPeriod,
                supplier_id: supplier ? supplier._id : '',
            });
            toast('盘点单已创建', 'success');
            nav('/pages/stocktake/edit?id=' + res.id);
        }
        catch (err) {
            toastError(err);
        }
        finally {
            wx.hideLoading();
            this.setData({ creating: false });
        }
    },
    goDetail(e) {
        nav('/pages/stocktake/edit?id=' + e.currentTarget.dataset.id);
    },
});
