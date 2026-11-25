import { call, toastError } from '../../utils/api';
import { getMe } from '../../utils/auth';
import { PLATFORMS, FULFILL_MODES, FULFILL_VALUES, BIZ_TYPES } from '../../utils/config';
import { money, percent } from '../../utils/format';
import { back, toast } from '../../utils/ui';
function num(value) {
    const n = Number(value);
    return isFinite(n) ? n : 0;
}
Page({
    data: {
        orderId: '',
        loading: true,
        saving: false,
        showCost: false,
        platforms: PLATFORMS,
        platformIndex: 4,
        bizTypes: BIZ_TYPES,
        bizTypeIndex: 0,
        isTradeIn: false,
        tradeOldBrand: '',
        tradeOldModel: '',
        tradeOldSpec: '',
        tradeDefect: '',
        tradeCredit: '',
        tradeCustomerName: '',
        tradeCustomerPhone: '',
        tradeInStatus: '',
        fulfillLabels: FULFILL_MODES,
        fulfillValues: FULFILL_VALUES,
        fulfillIndex: 0,
        isDropship: false,
        suppliers: [],
        supplierNames: [],
        supplierIndex: 0,
        dropship_freight: '',
        itemCost: '',
        statusList: ['待付款', '待发货'],
        statusIndex: 1,
        platform_order_no: '',
        buyer_name: '',
        buyer_phone: '',
        address: '',
        note: '',
        products: [],
        productNames: [],
        pickerIndex: 0,
        itemQty: '1',
        itemPrice: '',
        items: [],
        shipping_fee: '',
        packaging_fee: '',
        gift_cost: '',
        referral_fee: '',
        referral_payee: '',
        commission: '',
        payment_fee: '',
        other_fee: '',
        paid_amount: '',
        goodsAmount: '0.00',
        costTotal: '0.00',
        feeTotal: '0.00',
        paidPreview: '0.00',
        tradeCreditText: '0.00',
        paidText: '',
        profitText: '0.00',
        profitRate: '-',
    },
    onLoad(options) {
        const id = options && options.id ? String(options.id) : '';
        this.setData({ orderId: id });
        wx.setNavigationBarTitle({ title: id ? '编辑订单' : '新建订单' });
        this.init();
    },
    async init() {
        try {
            const me = await getMe();
            const role = me.user ? me.user.role : '';
            this.setData({ showCost: ['owner', 'operator', 'finance'].indexOf(role) >= 0 });
            const res = await call('product.list', { pageSize: 100 });
            const products = res.list || [];
            let suppliers = [];
            try {
                const supplierRes = await call('supplier.list');
                suppliers = supplierRes.list || [];
            }
            catch (err) {
                suppliers = [];
            }
            this.setData({
                products,
                productNames: products.map((p) => `${p.name}${p.sku_code ? ' · ' + p.sku_code : ''}`),
                suppliers,
                supplierNames: suppliers.map((s) => s.name),
            });
            if (this.data.orderId) {
                await this.loadOrder();
            }
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
        const res = await call('order.get', { id: this.data.orderId });
        const order = res.order;
        const tradeIn = res.tradeIn || null;
        const platformIndex = Math.max(0, PLATFORMS.indexOf(order.platform));
        const isDropship = order.fulfill_mode === '代发';
        const items = (order.items || []).map((item) => ({
            ...item,
            price_text: money(item.price),
            amount_text: money(item.amount),
            cost_text: money(item.cost_snapshot),
        }));
        this.setData({
            platformIndex,
            bizTypeIndex: Math.max(0, BIZ_TYPES.indexOf(order.biz_type || '普通')),
            isTradeIn: order.biz_type === '以旧换新',
            tradeOldBrand: tradeIn ? tradeIn.old_brand || '' : '',
            tradeOldModel: tradeIn ? tradeIn.old_model || '' : '',
            tradeOldSpec: tradeIn ? tradeIn.old_spec || '' : '',
            tradeDefect: tradeIn ? tradeIn.defect_desc || '' : '',
            tradeCredit: order.trade_in_credit ? String(order.trade_in_credit) : '',
            tradeCustomerName: tradeIn ? tradeIn.customer_name || '' : '',
            tradeCustomerPhone: tradeIn ? tradeIn.customer_phone || '' : '',
            tradeInStatus: tradeIn ? tradeIn.status : '',
            fulfillIndex: isDropship ? 1 : 0,
            isDropship,
            supplierIndex: Math.max(0, this.data.suppliers.findIndex((s) => s._id === order.supplier_id)),
            dropship_freight: order.dropship_freight ? String(order.dropship_freight) : '',
            statusIndex: Math.max(0, this.data.statusList.indexOf(order.status)),
            platform_order_no: order.platform_order_no || '',
            buyer_name: order.buyer_name || '',
            buyer_phone: order.buyer_phone || '',
            address: order.address || '',
            note: order.note || '',
            items,
            shipping_fee: order.shipping_fee ? String(order.shipping_fee) : '',
            packaging_fee: order.packaging_fee ? String(order.packaging_fee) : '',
            gift_cost: order.gift_cost ? String(order.gift_cost) : '',
            referral_fee: order.referral_fee ? String(order.referral_fee) : '',
            referral_payee: order.referral_payee || '',
            commission: order.commission ? String(order.commission) : '',
            payment_fee: order.payment_fee ? String(order.payment_fee) : '',
            other_fee: order.other_fee ? String(order.other_fee) : '',
            paid_amount: order.paid_amount ? String(order.paid_amount) : '',
        });
    },
    setField(field, value) {
        this.setData({ [field]: value });
    },
    onField(e) {
        const field = e.currentTarget.dataset.field;
        this.setField(field, e.detail.value);
        if ([
            'paid_amount',
            'shipping_fee',
            'packaging_fee',
            'gift_cost',
            'referral_fee',
            'commission',
            'payment_fee',
            'other_fee',
            'dropship_freight',
            'tradeCredit',
        ].indexOf(field) >= 0) {
            this.compute();
        }
    },
    onPlatformChange(e) {
        this.setData({ platformIndex: Number(e.detail.value) });
    },
    onBizTypeChange(e) {
        const index = Number(e.detail.value);
        this.setData({ bizTypeIndex: index, isTradeIn: BIZ_TYPES[index] === '以旧换新' });
        this.compute();
    },
    onFulfillChange(e) {
        const index = Number(e.detail.value);
        this.setData({ fulfillIndex: index, isDropship: this.data.fulfillValues[index] === '代发' });
        this.compute();
    },
    onSupplier(e) {
        this.setData({ supplierIndex: Number(e.detail.value) });
    },
    onStatusChange(e) {
        this.setData({ statusIndex: Number(e.detail.value) });
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
        let snapshot;
        if (this.data.isDropship) {
            snapshot = num(this.data.itemCost);
            if (!(snapshot > 0)) {
                toast('请填写代发进价');
                return;
            }
        }
        const items = this.data.items.slice();
        items.push({
            product_id: product._id,
            product_name: product.name,
            sku_code: product.sku_code,
            qty,
            price,
            amount: price * qty,
            price_text: money(price),
            amount_text: money(price * qty),
            cost_snapshot: snapshot,
            cost_text: snapshot === undefined ? '' : money(snapshot),
        });
        this.setData({ items, itemQty: '1', itemPrice: '', itemCost: '' });
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
        const items = this.data.items;
        const goods = items.reduce((sum, item) => sum + num(String(item.price)) * Number(item.qty), 0);
        const feeFields = ['shipping_fee', 'packaging_fee', 'gift_cost', 'referral_fee', 'commission', 'payment_fee', 'other_fee'];
        const fees = feeFields.reduce((sum, field) => sum + num(this.data[field]), 0);
        const paid = this.data.paid_amount === '' ? goods : num(this.data.paid_amount);
        const cost = items.reduce((sum, item) => sum + Number(item.cost_snapshot || 0) * Number(item.qty), 0);
        const dropshipFreight = this.data.isDropship ? num(this.data.dropship_freight) : 0;
        const tradeCredit = this.data.isTradeIn ? num(this.data.tradeCredit) : 0;
        const profit = paid + tradeCredit - fees - cost - dropshipFreight;
        const netPaid = paid + tradeCredit;
        this.setData({
            goodsAmount: money(goods),
            costTotal: money(cost),
            dropshipFreightText: money(dropshipFreight),
            feeTotal: money(fees),
            paidPreview: money(paid),
            paidText: money(netPaid),
            tradeCreditText: money(tradeCredit),
            profitText: money(profit),
            profitRate: netPaid > 0 ? percent(profit / netPaid) : '-',
        });
    },
    async onSave() {
        if (!this.data.items.length) {
            toast('请至少添加一件商品');
            return;
        }
        const fulfillMode = this.data.fulfillValues[this.data.fulfillIndex];
        const isDropship = fulfillMode === '代发';
        const supplier = this.data.suppliers[this.data.supplierIndex];
        if (isDropship && !supplier) {
            toast('请先在供应商管理中新增加供应商');
            return;
        }
        if (isDropship && this.data.items.some((item) => !(Number(item.cost_snapshot) > 0))) {
            toast('代发商品需要填写代发进价');
            return;
        }
        if (this.data.isTradeIn && !(num(this.data.tradeCredit) > 0)) {
            toast('请填写旧竿折价金额');
            return;
        }
        if (this.data.saving)
            return;
        this.setData({ saving: true });
        try {
            const payload = {
                platform: this.data.platforms[this.data.platformIndex],
                status: this.data.statusList[this.data.statusIndex],
                biz_type: BIZ_TYPES[this.data.bizTypeIndex],
                trade_in_credit: this.data.isTradeIn ? num(this.data.tradeCredit) : 0,
                trade_in: this.data.isTradeIn
                    ? {
                        old_brand: this.data.tradeOldBrand,
                        old_model: this.data.tradeOldModel,
                        old_spec: this.data.tradeOldSpec,
                        defect_desc: this.data.tradeDefect,
                        credit_amount: num(this.data.tradeCredit),
                        customer_name: this.data.tradeCustomerName,
                        customer_phone: this.data.tradeCustomerPhone,
                    }
                    : null,
                fulfill_mode: fulfillMode,
                supplier_id: isDropship ? supplier._id : '',
                supplier_name: isDropship ? supplier.name : '',
                dropship_freight: isDropship ? num(this.data.dropship_freight) : 0,
                platform_order_no: this.data.platform_order_no,
                buyer_name: this.data.buyer_name,
                buyer_phone: this.data.buyer_phone,
                address: this.data.address,
                note: this.data.note,
                shipping_fee: num(this.data.shipping_fee),
                packaging_fee: num(this.data.packaging_fee),
                gift_cost: num(this.data.gift_cost),
                referral_fee: num(this.data.referral_fee),
                referral_payee: this.data.referral_payee,
                commission: num(this.data.commission),
                payment_fee: num(this.data.payment_fee),
                other_fee: num(this.data.other_fee),
                items: this.data.items.map((item) => ({
                    product_id: item.product_id,
                    price: Number(item.price),
                    qty: Number(item.qty),
                    cost_snapshot: item.cost_snapshot,
                })),
            };
            if (this.data.paid_amount !== '')
                payload.paid_amount = num(this.data.paid_amount);
            const action = this.data.orderId ? 'order.update' : 'order.save';
            if (this.data.orderId)
                payload.id = this.data.orderId;
            await call(action, payload);
            toast('已保存', 'success');
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
