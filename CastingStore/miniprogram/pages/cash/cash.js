import { call, toastError } from '../../utils/api';
import { can, getMe } from '../../utils/auth';
import { dateOnly, dateTime, money } from '../../utils/format';
import { confirm, prompt, toast } from '../../utils/ui';

function monthText(input) {
    const d = input ? new Date(input) : new Date();
    return dateOnly(d).slice(0, 7);
}

Page({
    data: {
        loading: true,
        allowed: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
        total: '0.00',
        month: monthText(),
        income: '0.00',
        expense: '0.00',
        net: '0.00',
        accounts: [],
        accountNames: [],
        accountIndex: 0,
        types: ['收入', '支出'],
        typeIndex: 0,
        categories: ['销售回款', '售后退款', '采购付款', '快递费', '介绍费', '赠品', '包装', '推广', '工资', '房租', '其他'],
        categoryIndex: 0,
        amount: '',
        note: '',
        date: dateOnly(new Date()),
        saving: false,
        txns: [],
    },
    onShow() {
        this.load();
    },
    async load() {
        this.setData({ loading: true });
        try {
            const me = await getMe();
            const allowed = can('cash', 'read');
            this.setData({
                allowed,
                canCreate: can('cash', 'create'),
                canUpdate: can('cash', 'update'),
                canDelete: can('cash', 'delete'),
            });
            if (!allowed)
                return;
            await Promise.all([this.loadAccounts(), this.loadTxns()]);
        }
        catch (err) {
            toastError(err);
        }
        finally {
            this.setData({ loading: false });
        }
    },
    async loadAccounts() {
        const res = await call('cash.accounts');
        const accounts = (res.list || []).map((item) => ({
            ...item,
            balance_text: money(item.balance),
            initial_text: money(item.initial_balance),
        }));
        let index = this.data.accountIndex;
        if (index >= accounts.length)
            index = Math.max(0, accounts.findIndex((item) => item.is_default));
        this.setData({
            accounts,
            accountNames: accounts.map((item) => `${item.name}（¥${item.balance_text}）`),
            accountIndex: index,
            total: money(res.total),
        });
    },
    async loadTxns() {
        const res = await call('cash.txns', { month: this.data.month });
        const txns = (res.list || []).map((item) => ({
            ...item,
            amount_text: money(item.amount),
            date_text: dateTime(item.occurred_at || item.created_at),
            income: item.type !== '支出',
        }));
        this.setData({
            txns,
            income: money(res.summary ? res.summary.income : 0),
            expense: money(res.summary ? res.summary.expense : 0),
            net: money(res.summary ? res.summary.net : 0),
        });
    },
    onMonth(e) {
        this.setData({ month: e.detail.value });
        this.loadTxns().catch(toastError);
    },
    onType(e) {
        this.setData({ typeIndex: Number(e.currentTarget.dataset.index) });
    },
    onCategory(e) {
        this.setData({ categoryIndex: Number(e.detail.value) });
    },
    onAccount(e) {
        this.setData({ accountIndex: Number(e.detail.value) });
    },
    onDate(e) {
        this.setData({ date: e.detail.value });
    },
    onAmount(e) {
        this.setData({ amount: e.detail.value });
    },
    onNote(e) {
        this.setData({ note: e.detail.value });
    },
    async onSaveTxn() {
        if (this.data.saving)
            return;
        const account = this.data.accounts[this.data.accountIndex];
        if (!account) {
            toast('请先新增资金账户');
            return;
        }
        const amount = Number(this.data.amount);
        if (!(amount > 0)) {
            toast('请填写正确的金额');
            return;
        }
        this.setData({ saving: true });
        try {
            await call('cash.txn.create', {
                type: this.data.types[this.data.typeIndex],
                amount,
                category: this.data.categories[this.data.categoryIndex],
                account_id: account._id,
                occurred_at: `${this.data.date}T12:00:00+08:00`,
                note: this.data.note,
            });
            toast('已登记', 'success');
            this.setData({ amount: '', note: '' });
            await Promise.all([this.loadAccounts(), this.loadTxns()]);
        }
        catch (err) {
            toastError(err);
        }
        finally {
            this.setData({ saving: false });
        }
    },
    async onDeleteTxn(e) {
        const id = e.currentTarget.dataset.id;
        if (!id)
            return;
        if (!(await confirm('删除流水', '删除后账户余额会同步调整，确定删除？')))
            return;
        try {
            await call('cash.txn.remove', { id });
            toast('已删除', 'success');
            await Promise.all([this.loadAccounts(), this.loadTxns()]);
        }
        catch (err) {
            toastError(err);
        }
    },
    async onAddAccount() {
        const name = await prompt('新增资金账户', '账户名称，如：微信零钱');
        if (name === null)
            return;
        const trimmed = name.trim();
        if (!trimmed) {
            toast('请填写账户名称');
            return;
        }
        const initial = await prompt('期初余额', '当前账户余额，没有就填 0');
        if (initial === null)
            return;
        try {
            await call('cash.account.create', {
                name: trimmed,
                initial_balance: Number(initial) || 0,
            });
            toast('已新增', 'success');
            await this.loadAccounts();
        }
        catch (err) {
            toastError(err);
        }
    },
    async onDefaultAccount(e) {
        const id = e.currentTarget.dataset.id;
        if (!id)
            return;
        try {
            await call('cash.account.default', { id });
            toast('已设为默认', 'success');
            await this.loadAccounts();
        }
        catch (err) {
            toastError(err);
        }
    },
    async onDeleteAccount(e) {
        const id = e.currentTarget.dataset.id;
        if (!id)
            return;
        if (!(await confirm('删除账户', '只有没有流水的账户可以删除，确定继续？')))
            return;
        try {
            await call('cash.account.remove', { id });
            toast('已删除', 'success');
            await this.loadAccounts();
        }
        catch (err) {
            toastError(err);
        }
    },
});
