import { call, toastError } from '../../utils/api';
import { dateTime, money } from '../../utils/format';
import { confirm, nav, toast } from '../../utils/ui';

function rowFromBom(item, products) {
    const index = products.findIndex((row) => row._id === item.product_id);
    return {
        product_id: item.product_id,
        product_name: item.product_name,
        productIndex: index >= 0 ? index : 0,
        std: String(item.qty || ''),
        weight: String(item.weight || 1),
        qty_good: '',
        qty_defect: '',
        defect_product_id: '',
        defectIndex: 0,
    };
}

Page({
    data: {
        loading: true,
        saving: false,
        isView: false,
        dismantle: null,
        sourceProduct: null,
        products: [],
        productNames: [],
        defectNames: ['不指定瑕疵 SKU'],
        rows: [],
        laborCost: '',
        lossText: '0.00',
        dateText: '',
        totalCostText: '0.00',
        viewItems: [],
    },
    onLoad(options) {
        this.dismantleId = options && options.id ? String(options.id) : '';
        this.tradeInId = options && options.trade_in_id ? String(options.trade_in_id) : '';
        this.sourceProductId = options && options.source_product_id ? String(options.source_product_id) : '';
        this.warehouseId = options && options.warehouse_id ? String(options.warehouse_id) : '';
        if (this.dismantleId) {
            wx.setNavigationBarTitle({ title: '拆解单' });
            this.loadView();
        }
        else {
            this.initCreate();
        }
    },
    async loadView() {
        try {
            const res = await call('dismantle.get', { id: this.dismantleId });
            const dismantle = res.dismantle;
            const viewItems = (dismantle.items || []).map((item) => ({
                ...item,
                good_text: money(item.good_amount),
                defect_text: money(item.defect_amount),
                loss_text: money(item.loss_amount),
            }));
            this.setData({
                isView: true,
                dismantle,
                viewItems,
                dateText: dateTime(dismantle.created_at),
                totalCostText: money(dismantle.total_cost),
                lossText: money(dismantle.loss_amount),
            });
        }
        catch (err) {
            toastError(err);
        }
        finally {
            this.setData({ loading: false });
        }
    },
    async initCreate() {
        try {
            const prodRes = await call('product.list', { limit: 200 });
            const products = (prodRes.list || []).filter((row) => row.status !== '停售');
            this.setData({
                products,
                productNames: products.map((row) => `${row.name}（${row.item_type || '整竿'}）`),
                defectNames: ['不指定瑕疵 SKU'].concat(products.map((row) => row.name)),
            });

            if (this.tradeInId) {
                const tradeRes = await call('tradeIn.get', { id: this.tradeInId });
                const tradeIn = tradeRes.tradeIn;
                this.sourceProductId = tradeIn.product_id || this.sourceProductId;
                this.warehouseId = tradeIn.warehouse_id || this.warehouseId;
            }

            let sourceProduct = null;
            if (this.sourceProductId) {
                sourceProduct = (await call('product.get', { id: this.sourceProductId })).product;
            }
            this.setData({ sourceProduct });

            let bomItems = [];
            if (this.sourceProductId) {
                const bomRes = await call('bom.get', { source_product_id: this.sourceProductId });
                bomItems = (bomRes.bom && bomRes.bom.items) || [];
            }
            const rows = bomItems.map((item) => rowFromBom(item, products));
            if (!rows.length)
                rows.push(this.emptyRow(products));
            this.setData({ rows });
        }
        catch (err) {
            toastError(err);
        }
        finally {
            this.setData({ loading: false });
        }
    },
    emptyRow(products) {
        const list = products || this.data.products;
        return {
            product_id: list.length ? list[0]._id : '',
            product_name: list.length ? list[0].name : '',
            productIndex: 0,
            std: '',
            weight: '1',
            qty_good: '',
            qty_defect: '',
            defect_product_id: '',
            defectIndex: 0,
        };
    },
    onRowProduct(e) {
        const index = Number(e.currentTarget.dataset.index);
        const value = Number(e.detail.value);
        const rows = this.data.rows.slice();
        const product = this.data.products[value];
        rows[index].productIndex = value;
        rows[index].product_id = product ? product._id : '';
        rows[index].product_name = product ? product.name : '';
        this.setData({ rows });
    },
    onRowDefect(e) {
        const index = Number(e.currentTarget.dataset.index);
        const value = Number(e.detail.value);
        const rows = this.data.rows.slice();
        const product = value > 0 ? this.data.products[value - 1] : null;
        rows[index].defectIndex = value;
        rows[index].defect_product_id = product ? product._id : '';
        this.setData({ rows });
    },
    onRowField(e) {
        const index = Number(e.currentTarget.dataset.index);
        const field = e.currentTarget.dataset.field;
        const rows = this.data.rows.slice();
        rows[index][field] = e.detail.value;
        this.setData({ rows });
        this.calcLoss();
    },
    onLabor(e) {
        this.setData({ laborCost: e.detail.value });
        this.calcLoss();
    },
    calcLoss() {
        const goods = this.data.rows.reduce((sum, row) => sum + Number(row.qty_good || 0), 0);
        const defects = this.data.rows.reduce((sum, row) => sum + Number(row.qty_defect || 0), 0);
        this.setData({ lossText: String(goods + defects) });
    },
    onAddRow() {
        const rows = this.data.rows.slice();
        rows.push(this.emptyRow());
        this.setData({ rows });
    },
    onRemoveRow(e) {
        const index = Number(e.currentTarget.dataset.index);
        const rows = this.data.rows.slice();
        rows.splice(index, 1);
        this.setData({ rows });
    },
    async onSaveBom() {
        if (!this.data.sourceProduct) {
            toast('缺少来源商品');
            return;
        }
        const items = this.data.rows
            .filter((row) => row.product_id && Number(row.std) > 0)
            .map((row) => ({
                product_id: row.product_id,
                qty: Number(row.std),
                weight: Number(row.weight) || 1,
            }));
        if (!items.length) {
            toast('请至少填写一行标准零件数量');
            return;
        }
        try {
            await call('bom.save', { source_product_id: this.data.sourceProduct._id, items });
            toast('BOM 已保存', 'success');
        }
        catch (err) {
            toastError(err);
        }
    },
    async onSubmit() {
        if (!this.data.sourceProduct) {
            toast('缺少来源商品');
            return;
        }
        if (!this.warehouseId) {
            toast('缺少仓库信息，请从回收单进入');
            return;
        }
        const items = this.data.rows
            .filter((row) => Number(row.qty_good) > 0 || Number(row.qty_defect) > 0)
            .map((row) => ({
                product_id: row.product_id,
                qty_good: Number(row.qty_good) || 0,
                qty_defect: Number(row.qty_defect) || 0,
                defect_product_id: row.defect_product_id,
            }));
        if (!items.length) {
            toast('请填写实际产出的良品或瑕疵数量');
            return;
        }
        const missingDefect = this.data.rows.find(
            (row) => Number(row.qty_defect) > 0 && !row.defect_product_id
        );
        if (missingDefect) {
            toast(`请为 ${missingDefect.product_name} 指定瑕疵件 SKU`);
            return;
        }
        const ok = await confirm('执行拆解', '拆解将扣减旧竿库存并按 BOM 权重分摊成本，确认执行？');
        if (!ok)
            return;
        this.setData({ saving: true });
        try {
            const res = await call('dismantle.create', {
                trade_in_id: this.tradeInId || '',
                source_product_id: this.data.sourceProduct._id,
                warehouse_id: this.warehouseId,
                qty: 1,
                labor_cost: Number(this.data.laborCost) || 0,
                items,
            });
            toast('拆解完成', 'success');
            if (this.tradeInId) {
                setTimeout(() => nav('/pages/tradeins/edit?id=' + this.tradeInId), 500);
            }
            else if (res.id) {
                setTimeout(() => nav('/pages/dismantles/edit?id=' + res.id), 500);
            }
        }
        catch (err) {
            toastError(err);
        }
        finally {
            this.setData({ saving: false });
        }
    },
});
