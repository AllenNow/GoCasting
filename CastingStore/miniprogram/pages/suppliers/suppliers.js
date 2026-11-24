import { call, toastError } from '../../utils/api';
import { nav } from '../../utils/ui';
Page({
    data: {
        loading: true,
        list: [],
        keyword: '',
    },
    onShow() {
        this.load();
    },
    async load() {
        this.setData({ loading: true });
        try {
            const res = await call('supplier.list', { keyword: this.data.keyword });
            this.setData({ list: res.list || [] });
        }
        catch (err) {
            toastError(err);
        }
        finally {
            this.setData({ loading: false });
        }
    },
    onKeyword(e) {
        this.setData({ keyword: e.detail.value });
    },
    doSearch() {
        this.load();
    },
    goEdit(e) {
        nav('/pages/suppliers/edit?id=' + e.currentTarget.dataset.id);
    },
    goNew() {
        nav('/pages/suppliers/edit');
    },
});
