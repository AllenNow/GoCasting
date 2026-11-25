import { call, toastError } from '../../utils/api';
import { can, getMe } from '../../utils/auth';
import { dateTime, money, percent } from '../../utils/format';
import { back, confirm, nav, toast } from '../../utils/ui';
Page({
    data: {
        id: '',
        loading: true,
        order: null,
        expenses: [],
        afterSales: [],
        showCost: false,
        canEdit: false,
        canShip: false,
        canComplete: false,
        canRefund: false,
        canCancel: false,
        canDelete: false,
        canAfterSale: false,
        tradeIn: null,
        isTradeIn: false,
        tradeCreditText: '0.00',
        isDropship: false,
        canSettle: false,
        accounts: [],
        accountNames: [],
        accountIndex: 0,
        settle_amount: '',
        trackingNo: '',
        payableText: '0.00',
        supplierPaidText: '0.00',
        supplierRemainText: '0.00',
        paidText: '0.00',
        costText: '0.00',
        refundCostText: '0.00',
        feeText: '0.00',
        profitText: '0.00',
        profitRate: '-',
        refundText: '0.00',
        dateText: '',
        shippedText: '',
    },
    onLoad(options) {
        this.setData({ id: options && options.id ? String(options.id) : '' });
    },
    onShow() {
        this.load();
    },
    async load() {
        this.setData({ loading: true });
        try {
            const me = await getMe();
            const role = me.user ? me.user.role : '';
            const res = await call('order.get', { id: this.data.id });
            const order = res.order;
            const status = order.status;
            const showCost = ['owner', 'operator', 'finance'].indexOf(role) >= 0;
            const isDropship = order.fulfill_mode === '代发';
            const shipped = status === '已发货' || status === '已完成' || !!order.shipped_at;
            const afterSales = (res.afterSales || []).map((row) => ({
                ...row,
                refund_text: money(row.refund_amount),
                items_text: (row.items || []).map((item) => `${item.product_name}×${item.qty}`).join('、'),
                date_text: dateTime(row.created_at),
            }));
            const hasRemaining = (order.items || []).some((item) => Number(item.remaining_qty) > 0);
            const payable = Number(order.supplier_payable || 0);
            const supplierPaid = Number(order.supplier_paid_amount || 0);
            const remain = Math.max(0, payable - supplierPaid);
            const canSettle = isDropship && remain > 0 && can('order', 'settle');

            let accounts = [];
            if (canSettle) {
                try {
                    const accRes = await call('cash.accounts');
                    accounts = accRes.list || [];
                }
                catch (err) {
                    accounts = [];
                }
            }

            this.setData({
                order,
                tradeIn: res.tradeIn || null,
                isTradeIn: order.biz_type === '以旧换新',
                tradeCreditText: money(order.trade_in_credit),
                expenses: res.expenses || [],
                afterSales,
                showCost,
                isDropship,
                paidText: money(order.paid_amount),
                costText: money(order.goods_cost),
                feeText: money(order.fee_total),
                profitText: money(order.profit),
                profitRate: percent(order.profit_rate),
                refundText: money(order.refund_amount),
                dateText: dateTime(order.created_at),
                shippedText: order.shipped_at ? dateTime(order.shipped_at) : '',
                canEdit: ['待付款', '待发货'].indexOf(status) >= 0 && can('order', 'update'),
                canShip: ['待付款', '待发货'].indexOf(status) >= 0 && can('order', 'ship'),
                canComplete: status === '已发货' && can('order', 'update'),
                canRefund: ['已退款', '已取消'].indexOf(status) < 0 && Number(order.refund_amount || 0) < Number(order.paid_amount || 0) && can('order', 'refund')
                    && (order.biz_type !== '以旧换新' || role === 'owner'),
                canCancel: ['待付款', '待发货'].indexOf(status) >= 0
                    && Number(order.paid_amount || 0) - Number(order.refund_amount || 0) <= 0.01
                    && can('order', 'update'),
                canDelete: ['待付款', '已取消'].indexOf(status) >= 0 && can('order', 'delete'),
                canAfterSale: shipped && ['已退款', '已取消'].indexOf(status) < 0 && hasRemaining && can('afterSale', 'create'),
                hasRefund: Number(order.refund_amount || 0) > 0,
                hasRefundCost: Number(order.refund_cost || 0) > 0,
                refundCostText: money(order.refund_cost),
                dropshipFreightText: money(order.dropship_freight),
                canSettle,
                accounts,
                accountNames: accounts.map((item) => item.name),
                accountIndex: 0,
                settle_amount: remain > 0 ? String(remain) : '',
                payableText: money(payable),
                supplierPaidText: money(supplierPaid),
                supplierRemainText: money(remain),
            });
        }
        catch (err) {
            toastError(err);
        }
        finally {
            this.setData({ loading: false });
        }
    },
    goEdit() {
        nav('/pages/orders/edit?id=' + this.data.id);
    },
    goTradeIn() {
        if (this.data.tradeIn)
            nav('/pages/tradeins/edit?id=' + this.data.tradeIn._id);
    },
    goAfterSale() {
        nav('/pages/aftersales/edit?order_id=' + this.data.id);
    },
    goAfterSaleDetail(e) {
        nav('/pages/aftersales/edit?id=' + e.currentTarget.dataset.id);
    },
    onSettleField(e) {
        this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
    },
    onAccountChange(e) {
        this.setData({ accountIndex: Number(e.detail.value) });
    },
    async onSettle() {
        const account = this.data.accounts[this.data.accountIndex];
        if (!(await confirm('结算供应商', `本次结算 ¥${this.data.settle_amount || 0}${account ? '，从「' + account.name + '」支出' : ''}，继续？`)))
            return;
        wx.showLoading({ title: '处理中' });
        try {
            await call('order.settleSupplier', {
                id: this.data.id,
                amount: this.data.settle_amount,
                account_id: account ? account._id : '',
                note: '代发订单供应商结算',
            });
            toast('已结算', 'success');
            await this.load();
        }
        catch (err) {
            toastError(err);
        }
        finally {
            wx.hideLoading();
        }
    },
    onTrackingInput(e) {
        this.setData({ trackingNo: e.detail.value });
    },
    async onShip() {
        const trackingNo = String(this.data.trackingNo || '').trim();
        if (!trackingNo) {
            toast('请填写快递单号');
            return;
        }
        const tip = this.data.isDropship
            ? '代发订单由供应商直发，不扣减自仓库存，确认发货？'
            : '发货后将扣减库存，并按当前成本快照计算毛利。';
        if (!(await confirm('确认发货', tip)))
            return;
        wx.showLoading({ title: '处理中' });
        try {
            await call('order.ship', { id: this.data.id, tracking_no: trackingNo });
            toast('已发货', 'success');
            this.setData({ trackingNo: '' });
            await this.load();
        }
        catch (err) {
            toastError(err);
        }
        finally {
            wx.hideLoading();
        }
    },
    async onComplete() {
        if (!(await confirm('确认完成', '确认买家已收货？')))
            return;
        try {
            await call('order.complete', { id: this.data.id });
            toast('已完成', 'success');
            await this.load();
        }
        catch (err) {
            toastError(err);
        }
    },
    async onRefund() {
        const tip = this.data.isDropship
            ? '代发订单退款不经过自仓库存，已发货部分将计入损耗；确认继续？'
            : '已发货订单退款会自动回补库存；确认继续？';
        if (!(await confirm('确认退款', tip)))
            return;
        wx.showLoading({ title: '处理中' });
        try {
            await call('order.refund', { id: this.data.id, reason: '手工退款' });
            toast('已退款', 'success');
            await this.load();
        }
        catch (err) {
            toastError(err);
        }
        finally {
            wx.hideLoading();
        }
    },
    async onCancel() {
        if (!(await confirm('取消订单', '取消后订单不能再发货，确认取消？')))
            return;
        wx.showLoading({ title: '处理中' });
        try {
            await call('order.cancel', { id: this.data.id, reason: '手动取消' });
            toast('已取消', 'success');
            await this.load();
        }
        catch (err) {
            toastError(err);
        }
        finally {
            wx.hideLoading();
        }
    },
    async onDelete() {
        if (!(await confirm('删除订单', '删除后不可恢复，确认删除？')))
            return;
        try {
            await call('order.remove', { id: this.data.id });
            toast('已删除', 'success');
            setTimeout(() => back(), 400);
        }
        catch (err) {
            toastError(err);
        }
    },
});
