import { call, toastError } from '../../utils/api';
import { can, getMe } from '../../utils/auth';
import { dateTime, money, qty } from '../../utils/format';
import { back, confirm, toast } from '../../utils/ui';

const PAGE_SIZE = 50;

function summarize(items) {
    let diffCount = 0;
    let gainQty = 0;
    let lossQty = 0;
    let gainAmount = 0;
    let lossAmount = 0;
    items.forEach((item) => {
        const diff = Number(item.diff || 0);
        if (!diff)
            return;
        diffCount += 1;
        const cost = Number(item.cost_snapshot || 0);
        if (diff > 0) {
            gainQty += diff;
            gainAmount += diff * cost;
        }
        else {
            lossQty += -diff;
            lossAmount += -diff * cost;
        }
    });
    return {
        diffCount,
        gainQtyText: qty(gainQty),
        lossQtyText: qty(lossQty),
        gainAmountText: money(gainAmount),
        lossAmountText: money(lossAmount),
    };
}

function decorate(item) {
    const system = Number(item.system_qty || 0);
    const counted = Number(item.counted_qty || 0);
    const diff = Math.round((counted - system) * 100) / 100;
    return {
        ...item,
        system_text: qty(system),
        counted_value: String(counted),
        counted_text: qty(counted),
        diff,
        diff_text: diff > 0 ? '+' + qty(diff) : qty(diff),
        diff_class: diff > 0 ? 'diff-up' : diff < 0 ? 'diff-down' : '',
        changed: diff !== 0,
        dirty: false,
    };
}

Page({
    data: {
        loading: true,
        recordId: '',
        record: null,
        items: [],
        itemCount: 0,
        visibleCount: 0,
        remainingCount: 0,
        hasMore: false,
        renderLimit: PAGE_SIZE,
        diffCount: 0,
        gainQtyText: '0',
        lossQtyText: '0',
        gainAmountText: '0.00',
        lossAmountText: '0.00',
        keyword: '',
        onlyDiff: false,
        supplierNames: ['全部供应商'],
        supplierIds: [''],
        supplierIndex: 0,
        note: '',
        showCost: false,
        canEdit: false,
    },
    allItems: [],
    onLoad(options) {
        this.setData({ recordId: options && options.id ? String(options.id) : '' });
        wx.setNavigationBarTitle({ title: '盘点单' });
        this.init();
    },
    async init() {
        try {
            const me = await getMe();
            const role = me.user ? me.user.role : '';
            this.setData({ showCost: ['owner', 'operator', 'finance'].indexOf(role) >= 0 });
            await this.load();
        }
        catch (err) {
            toastError(err);
        }
        finally {
            this.setData({ loading: false });
        }
    },
    async load() {
        const res = await call('stocktake.get', { id: this.data.recordId });
        const record = res.stocktake;
        this.allItems = (record.items || []).map(decorate);
        const supplierIds = [''];
        const supplierNames = ['全部供应商'];
        this.allItems.forEach((item) => {
            const id = item.supplier_id || '';
            if (!id || supplierIds.indexOf(id) >= 0)
                return;
            supplierIds.push(id);
            supplierNames.push(item.supplier_name || '未命名供应商');
        });
        const supplierIndex = record.supplier_id ? Math.max(0, supplierIds.indexOf(record.supplier_id)) : 0;
        const summary = summarize(this.allItems);
        this.setData({
            record: {
                ...record,
                date_text: dateTime(record.created_at),
                completed_text: record.completed_at ? dateTime(record.completed_at) : '',
            },
            note: record.note || '',
            itemCount: this.allItems.length,
            renderLimit: PAGE_SIZE,
            supplierIds,
            supplierNames,
            supplierIndex,
            canEdit: record.status === '盘点中' && can('inventory', 'adjust'),
            ...summary,
        });
        this.refresh();
    },
    refresh() {
        const kw = String(this.data.keyword || '').trim().toLowerCase();
        const onlyDiff = this.data.onlyDiff;
        const supplierId = (this.data.supplierIds || [])[this.data.supplierIndex] || '';
        const matched = this.allItems.filter((item) => {
            const name = String(item.product_name || '').toLowerCase();
            const sku = String(item.sku_code || '').toLowerCase();
            const matchKw = !kw || name.indexOf(kw) >= 0 || sku.indexOf(kw) >= 0;
            const matchSupplier = !supplierId || item.supplier_id === supplierId;
            return matchKw && matchSupplier && (!onlyDiff || item.changed);
        });
        const limit = Number(this.data.renderLimit) || PAGE_SIZE;
        const items = matched.slice(0, limit);
        this.setData({
            items,
            visibleCount: matched.length,
            remainingCount: Math.max(0, matched.length - items.length),
            hasMore: matched.length > items.length,
        });
    },
    onKeyword(e) {
        this.setData({ keyword: e.detail.value, renderLimit: PAGE_SIZE });
        this.refresh();
    },
    onToggleDiff() {
        this.setData({ onlyDiff: !this.data.onlyDiff, renderLimit: PAGE_SIZE });
        this.refresh();
    },
    onSupplier(e) {
        this.setData({ supplierIndex: Number(e.detail.value), renderLimit: PAGE_SIZE });
        this.refresh();
    },
    onLoadMore() {
        this.setData({ renderLimit: (Number(this.data.renderLimit) || PAGE_SIZE) + PAGE_SIZE });
        this.refresh();
    },
    onCounted(e) {
        const productId = e.currentTarget.dataset.productId;
        const displayIndex = Number(e.currentTarget.dataset.index);
        const raw = e.detail.value;
        const num = raw === '' ? 0 : Number(raw);
        const counted = isFinite(num) && num >= 0 ? num : 0;
        const index = this.allItems.findIndex((item) => item.product_id === productId);
        if (index < 0)
            return;
        const updated = decorate({ ...this.allItems[index], counted_qty: counted });
        updated.counted_value = raw;
        updated.dirty = true;
        this.allItems[index] = updated;
        const patch = {};
        patch[`items[${displayIndex}]`] = updated;
        this.setData({ ...patch, ...summarize(this.allItems) });
    },
    onNote(e) {
        this.setData({ note: e.detail.value });
    },
    async persist() {
        // 只提交本次修改过的商品，盘点项很多时显著减少请求体
        const items = this.allItems
            .filter((item) => item.dirty)
            .map((item) => ({ product_id: item.product_id, counted_qty: Number(item.counted_qty) || 0 }));
        return call('stocktake.save', {
            id: this.data.recordId,
            items,
            note: this.data.note,
        });
    },
    async onSave() {
        if (!this.data.canEdit)
            return;
        wx.showLoading({ title: '保存中' });
        try {
            await this.persist();
            toast('已保存', 'success');
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
        if (!this.data.canEdit)
            return;
        if (!(await confirm('完成盘点', `共 ${this.data.diffCount} 个差异。请确认盘点期间未发生出入库，完成后将按实盘数校正库存并生成盘盈/盘亏流水，且不能再修改。`)))
            return;
        wx.showLoading({ title: '处理中' });
        try {
            await this.persist();
            const res = await call('stocktake.complete', {
                id: this.data.recordId,
                note: this.data.note,
            });
            toast(`已完成，差异 ${res.diff_count} 个`, 'success');
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
        if (!(await confirm('删除盘点单', '删除后不可恢复，确认删除？')))
            return;
        try {
            await call('stocktake.remove', { id: this.data.recordId });
            toast('已删除', 'success');
            setTimeout(() => back(), 400);
        }
        catch (err) {
            toastError(err);
        }
    },
});
