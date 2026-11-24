import { call, toastError } from '../../utils/api';
import { can } from '../../utils/auth';
import { SETTLEMENTS, SUPPLIER_TYPES } from '../../utils/config';
import { back, confirm, toast } from '../../utils/ui';
Page({
    data: {
        id: '',
        loading: false,
        saving: false,
        types: SUPPLIER_TYPES,
        typeIndex: 0,
        settlements: SETTLEMENTS,
        settlementIndex: 0,
        name: '',
        contact: '',
        phone: '',
        lead_time_days: '',
        note: '',
        canDelete: false,
    },
    onLoad(options) {
        const id = options && options.id ? String(options.id) : '';
        this.setData({ id, canDelete: can('supplier', 'delete') });
        wx.setNavigationBarTitle({ title: id ? '编辑供应商' : '新增供应商' });
        if (id)
            this.load();
    },
    async load() {
        try {
            const res = await call('supplier.list');
            const supplier = (res.list || []).find((s) => s._id === this.data.id);
            if (!supplier)
                return;
            this.setData({
                name: supplier.name || '',
                contact: supplier.contact || '',
                phone: supplier.phone || '',
                lead_time_days: String(supplier.lead_time_days || ''),
                note: supplier.note || '',
                typeIndex: Math.max(0, SUPPLIER_TYPES.indexOf(supplier.type)),
                settlementIndex: Math.max(0, SETTLEMENTS.indexOf(supplier.settlement)),
            });
        }
        catch (err) {
            toastError(err);
        }
    },
    onField(e) {
        const field = e.currentTarget.dataset.field;
        this.setData({ [field]: e.detail.value });
    },
    onType(e) {
        this.setData({ typeIndex: Number(e.detail.value) });
    },
    onSettlement(e) {
        this.setData({ settlementIndex: Number(e.detail.value) });
    },
    async onSave() {
        if (!this.data.name.trim()) {
            toast('请填写供应商名称');
            return;
        }
        if (this.data.saving)
            return;
        this.setData({ saving: true });
        try {
            await call('supplier.save', {
                id: this.data.id || undefined,
                name: this.data.name.trim(),
                type: this.data.types[this.data.typeIndex],
                contact: this.data.contact,
                phone: this.data.phone,
                settlement: this.data.settlements[this.data.settlementIndex],
                lead_time_days: Number(this.data.lead_time_days) || 0,
                note: this.data.note,
            });
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
    async onDelete() {
        if (!(await confirm('删除供应商', '已有采购单的供应商无法删除。')))
            return;
        try {
            await call('supplier.remove', { id: this.data.id });
            toast('已删除', 'success');
            setTimeout(() => back(), 400);
        }
        catch (err) {
            toastError(err);
        }
    },
});
