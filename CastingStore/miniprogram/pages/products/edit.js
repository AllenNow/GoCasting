import { call, toastError } from '../../utils/api';
import { can } from '../../utils/auth';
import { CATEGORIES, ITEM_TYPES } from '../../utils/config';
import { back, confirm, toast } from '../../utils/ui';
const STATUS_LIST = ['在售', '停售', '清仓'];
const BRANDS = ['达亿瓦', '禧玛诺', 'MUYU', '其他'];
const CONDITIONS = ['99新', '95新', '9新', '85新', '8新', '磕碰', '故障', '拆机良品', '拆机瑕疵', '其他'];
Page({
    data: {
        id: '',
        loading: true,
        saving: false,
        categories: CATEGORIES,
        categoryIndex: 0,
        itemTypes: ITEM_TYPES,
        itemTypeIndex: 0,
        statusList: STATUS_LIST,
        statusIndex: 0,
        name: '',
        sku_code: '',
        brand: '',
        brandOptions: BRANDS,
        brandIndex: 0,
        brandOther: false,
        brandCustom: '',
        condition: '',
        conditionOptions: CONDITIONS,
        conditionIndex: 0,
        spec: '',
        unit: '件',
        barcode: '',
        safety_stock: '0',
        note: '',
        canDelete: false,
        suppliers: [],
        supplierNames: ['未指定'],
        supplierIndex: 0,
    },
    onLoad(options) {
        const id = options && options.id ? String(options.id) : '';
        const barcode = options && options.barcode ? decodeURIComponent(String(options.barcode)) : '';
        this.setData({ id, barcode, canDelete: can('product', 'delete') });
        wx.setNavigationBarTitle({ title: id ? '编辑商品' : '新增商品' });
        this.load();
    },
    async load() {
        try {
            let suppliers = [];
            try {
                const supplierRes = await call('supplier.list');
                suppliers = supplierRes.list || [];
            }
            catch (err) {
                suppliers = [];
            }
            const supplierNames = ['未指定'].concat(suppliers.map((item) => item.name));
            let fields = {};
            let supplierIndex = 0;
            if (this.data.id) {
                const res = await call('product.get', { id: this.data.id });
                const product = res.product;
                const brandValue = product.brand || '';
                const optionIndex = BRANDS.indexOf(brandValue);
                const brandOther = optionIndex < 0 && !!brandValue;
                fields = {
                    name: product.name || '',
                    sku_code: product.sku_code || '',
                    brand: brandValue,
                    brandIndex: brandOther ? BRANDS.length - 1 : Math.max(0, optionIndex),
                    brandOther,
                    brandCustom: brandOther ? brandValue : '',
                    condition: product.condition || '',
                    conditionIndex: Math.max(0, CONDITIONS.indexOf(product.condition)),
                    itemTypeIndex: Math.max(0, ITEM_TYPES.indexOf(product.item_type || '整竿')),
                    spec: product.spec || '',
                    unit: product.unit || '件',
                    barcode: product.barcode || '',
                    safety_stock: String(product.safety_stock || 0),
                    note: product.note || '',
                    categoryIndex: Math.max(0, CATEGORIES.indexOf(product.category)),
                    statusIndex: Math.max(0, STATUS_LIST.indexOf(product.status)),
                };
                supplierIndex = Math.max(0, suppliers.findIndex((item) => item._id === product.supplier_id) + 1);
            }
            this.setData({ suppliers, supplierNames, supplierIndex, ...fields });
        }
        catch (err) {
            toastError(err);
        }
        finally {
            this.setData({ loading: false });
        }
    },
    onField(e) {
        const field = e.currentTarget.dataset.field;
        this.setData({ [field]: e.detail.value });
    },
    onCategory(e) {
        this.setData({ categoryIndex: Number(e.detail.value) });
    },
    onStatus(e) {
        this.setData({ statusIndex: Number(e.detail.value) });
    },
    onBrand(e) {
        const index = Number(e.detail.value);
        if (this.data.brandOptions[index] === '其他') {
            this.setData({
                brandIndex: index,
                brandOther: true,
                brand: this.data.brandCustom || '',
            });
            return;
        }
        this.setData({
            brandIndex: index,
            brandOther: false,
            brandCustom: '',
            brand: this.data.brandOptions[index],
        });
    },
    onBrandInput(e) {
        this.setData({ brandCustom: e.detail.value, brand: e.detail.value });
    },
    onCondition(e) {
        const index = Number(e.detail.value);
        this.setData({
            conditionIndex: index,
            condition: this.data.conditionOptions[index],
        });
    },
    onItemType(e) {
        this.setData({ itemTypeIndex: Number(e.detail.value) });
    },
    onSupplier(e) {
        this.setData({ supplierIndex: Number(e.detail.value) });
    },
    onScan() {
        wx.scanCode({
            success: (res) => this.setData({ barcode: String(res.result || '') }),
            fail: () => toast('已取消扫码'),
        });
    },
    async onSave() {
        if (!this.data.name.trim()) {
            toast('请填写商品名称');
            return;
        }
        if (this.data.brandOther && !String(this.data.brand || '').trim()) {
            toast('请填写品牌名称');
            return;
        }
        if (this.data.saving)
            return;
        this.setData({ saving: true });
        try {
            await call('product.save', {
                id: this.data.id || undefined,
                name: this.data.name.trim(),
                sku_code: this.data.sku_code,
                category: this.data.categories[this.data.categoryIndex],
                brand: this.data.brand,
                condition: this.data.condition,
                item_type: this.data.itemTypes[this.data.itemTypeIndex],
                spec: this.data.spec,
                unit: this.data.unit,
                barcode: this.data.barcode,
                safety_stock: Number(this.data.safety_stock) || 0,
                status: this.data.statusList[this.data.statusIndex],
                supplier_id: this.data.supplierIndex > 0 ? this.data.suppliers[this.data.supplierIndex - 1]._id : '',
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
        if (!(await confirm('删除商品', '删除后不可恢复；有库存的商品无法删除。')))
            return;
        try {
            await call('product.remove', { id: this.data.id });
            toast('已删除', 'success');
            setTimeout(() => back(), 400);
        }
        catch (err) {
            toastError(err);
        }
    },
});
