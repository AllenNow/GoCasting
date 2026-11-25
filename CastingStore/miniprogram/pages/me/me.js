import { call } from '../../utils/api';
import { bootstrap, can, clearAuth, getMe } from '../../utils/auth';
import { confirm, nav, prompt, switchTab, toast } from '../../utils/ui';
const MODULE_LABELS = {
    product: '商品',
    supplier: '供应商',
    purchase: '采购',
    inventory: '库存',
    order: '订单',
    afterSale: '售后',
    expense: '费用',
    cash: '现金流',
    report: '报表',
    user: '用户',
    audit: '审计',
    setting: '设置',
};
Page({
    data: {
        loading: true,
        hasUser: false,
        needInit: false,
        openid: '',
        userName: '',
        roleLabel: '',
        permissionText: '',
        showUsers: false,
        showAudit: false,
        canWarehouse: false,
        canCash: false,
        warehouses: [],
    },
    onShow() {
        this.load();
    },
    async load() {
        this.setData({ loading: true });
        try {
            const me = await getMe(true);
            const user = me.user;
            let permissionText = '';
            if (user) {
                const keys = Object.keys(me.permissions || {});
                if (keys.indexOf('*') >= 0)
                    permissionText = '全部权限';
                else
                    permissionText = keys.map((key) => MODULE_LABELS[key] || key).join('、') || '无';
            }
            const canWarehouse = can('setting', 'create');
            this.setData({
                hasUser: !!user,
                needInit: me.needInit,
                openid: me.openid || '',
                userName: user ? user.name : '',
                roleLabel: user ? user.role_label : '',
                permissionText,
                showUsers: can('user', 'read'),
                showAudit: user ? user.role === 'owner' : false,
                canWarehouse,
                canCash: can('cash', 'read'),
            });
            if (canWarehouse) {
                try {
                    const res = await call('warehouse.list', {});
                    this.setData({ warehouses: res.list || [] });
                }
                catch (err) {
                    this.setData({ warehouses: [] });
                }
            }
        }
        catch (err) {
            toast(err instanceof Error ? err.message : '加载失败');
        }
        finally {
            this.setData({ loading: false });
        }
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
            toast(err instanceof Error ? err.message : '初始化失败');
        }
        finally {
            wx.hideLoading();
        }
    },
    onCopyOpenid() {
        wx.setClipboardData({
            data: this.data.openid,
            success: () => toast('已复制'),
        });
    },
    goInventory() {
        switchTab('/pages/inventory/inventory');
    },
    goOrders() {
        switchTab('/pages/orders/orders');
    },
    goReports() {
        switchTab('/pages/reports/reports');
    },
    goCash() {
        nav('/pages/cash/cash');
    },
    goAfterSales() {
        nav('/pages/aftersales/list');
    },
    goRepairs() {
        nav('/pages/repairs/list');
    },
    goTradeIns() {
        nav('/pages/tradeins/list');
    },
    goSuppliers() {
        nav('/pages/suppliers/suppliers');
    },
    goPurchase() {
        nav('/pages/purchase/purchase');
    },
    goUsers() {
        nav('/pages/users/users');
    },
    goAudit() {
        nav('/pages/users/users?tab=audit');
    },
    async onAddWarehouse() {
        const name = await prompt('新增仓库', '仓库名称，如：二号仓');
        if (name === null)
            return;
        const trimmed = name.trim();
        if (!trimmed) {
            toast('请填写仓库名称');
            return;
        }
        try {
            await call('warehouse.save', { name: trimmed });
            toast('已新增', 'success');
            this.load();
        }
        catch (err) {
            toast(err instanceof Error ? err.message : '新增失败');
        }
    },
    async onDefaultWarehouse(e) {
        const id = e.currentTarget.dataset.id;
        if (!id)
            return;
        try {
            await call('warehouse.default', { id });
            toast('已设为默认', 'success');
            this.load();
        }
        catch (err) {
            toast(err instanceof Error ? err.message : '设置失败');
        }
    },
    async onDeleteWarehouse(e) {
        const id = e.currentTarget.dataset.id;
        if (!id)
            return;
        if (!(await confirm('删除仓库', '仓库内不能有库存和未完成采购单，确定删除？')))
            return;
        try {
            await call('warehouse.remove', { id });
            toast('已删除', 'success');
            this.load();
        }
        catch (err) {
            toast(err instanceof Error ? err.message : '删除失败');
        }
    },
    async onClear() {
        if (!(await confirm('清除本地缓存', '会重新向云函数获取身份，不影响云端数据。')))
            return;
        clearAuth();
        toast('已清除');
        this.load();
    },
});
